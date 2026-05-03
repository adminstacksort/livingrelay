import { accounts, people, platformSettings, properties, workOrders } from "./data.js";
import { attachOutboundCallSessions } from "./liveCallControl.js";
import { createMediaRelayToken } from "./mediaRelay.js";
import { prepareVendorOutreach, recordVendorCallResults, upsertCallAttempt, vendorCallQuestions } from "./vendorWorkflow.js";
import { startVoiceCall } from "./twilioClient.js";

export async function startVendorQuoteCalls(orderId, { actor = "manager", demoFallback = true, testVendorPhone = "", testOnly = false, onlyVendorPhone = "" } = {}) {
  const prepared = prepareVendorOutreach(orderId, { actor, mode: "ElevenLabs calls", provider: "ElevenLabs" });
  if (prepared.error) return { started: false, calls: [], reason: prepared.error };
  const { order, property, settings } = prepared;
  const account = accounts.find((item) => item.id === property?.accountId);
  const productionAllowed = platformSettings.productionVendorCallsEnabled !== false && account?.productionVendorCallsEnabled !== false && settings.productionVendorCallsEnabled !== false;
  const effectiveTestMode = platformSettings.vendorCallTestMode !== false || process.env.VENDOR_CALL_TEST_MODE === "true" || testOnly || Boolean(testVendorPhone);
  if (!productionAllowed && !effectiveTestMode) {
    return {
      started: false,
      calls: [],
      reason: "Production vendor calls are disabled for this platform or property."
    };
  }
  if (effectiveTestMode && !(testVendorPhone || platformSettings.vendorCallTestNumber || process.env.VENDOR_CALL_TEST_NUMBER)) {
    return {
      started: false,
      calls: [],
      reason: "Vendor call test mode is enabled, but no test vendor phone is configured."
    };
  }
  const candidates = onlyVendorPhone
    ? prepared.options.filter((option) => normalizePhone(option.phone) === normalizePhone(onlyVendorPhone))
    : prepared.options;
  if (!candidates.length) {
    return {
      started: false,
      calls: [],
      reason: onlyVendorPhone ? `No prepared vendor matched retry phone ${onlyVendorPhone}.` : "No vendors available to call."
    };
  }
  const options = buildCallOptions(candidates, { testVendorPhone, testOnly });

  if (process.env.ENABLE_VENDOR_CALLS !== "true") {
    if (demoFallback) {
      const calls = options.map((option, index) => demoCallResult(option, order, index));
      attachOutboundCallSessions(order, calls);
      recordVendorCallResults(order.id, calls, { actor: "Demo fallback" });
      return {
        started: true,
        demo: true,
        calls,
        reason: "Vendor calls are disabled, so demo vendor outcomes were generated."
      };
    }
    return {
      started: false,
      calls: [],
      reason: "Vendor calls are disabled. Set ENABLE_VENDOR_CALLS=true after adding ElevenLabs credentials."
    };
  }

  const missing = ["ELEVENLABS_API_KEY", "ELEVENLABS_AGENT_ID", "ELEVENLABS_AGENT_PHONE_NUMBER_ID"].filter((key) => !process.env[key]);
  if (missing.length) {
    return { started: false, calls: [], reason: `Missing ElevenLabs env: ${missing.join(", ")}` };
  }

  const tenant = people.find((person) => person.id === order.tenantId);

  const calls = [];
  for (const option of options.slice(0, 5)) {
    const result = process.env.VENDOR_CALL_PROVIDER === "twilio_register"
      ? await startTwilioRegisteredCall({
        vendor: option,
        property,
        tenant,
        order
      })
      : await startOutboundCall({
        vendor: option,
        property,
        tenant,
        order
      });
    calls.push(result);
    upsertCallAttempt(order, option, {
      status: result.success ? "initiated" : "failed",
      provider: result.provider || "elevenlabs_native",
      callSid: result.callSid || result.call_sid,
      conversationId: result.conversation_id || result.conversationId,
      callKey: result.callKey,
      outcome: result.error || result.summary || ""
    });
  }
  order.timeline.push({
    label: "ElevenLabs quote calls started",
    detail: calls.map((call) => `${call.vendor}: ${call.success ? call.callSid || call.conversation_id : call.error}`).join("; "),
    stamp: new Date().toISOString()
  });
  order.vendorOutreach.status = "Calls initiated";
  order.vendorOutreach.provider = process.env.VENDOR_CALL_PROVIDER === "twilio_register" ? "Twilio + ElevenLabs" : "ElevenLabs";
  order.vendorOutreach.startedAt = order.vendorOutreach.startedAt || new Date().toISOString();
  attachOutboundCallSessions(order, calls);
  return { started: true, calls, testMode: isTestMode({ testVendorPhone, testOnly }) };
}

async function startOutboundCall({ vendor, property, tenant, order }) {
  try {
    const response = await fetch("https://api.elevenlabs.io/v1/convai/twilio/outbound-call", {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        agent_id: process.env.ELEVENLABS_AGENT_ID,
        agent_phone_number_id: process.env.ELEVENLABS_AGENT_PHONE_NUMBER_ID,
        to_number: vendor.phone,
        call_recording_enabled: true,
        conversation_initiation_client_data: {
          dynamic_variables: {
            vendor_name: vendor.name,
            original_vendor_name: vendor.originalVendorName || vendor.name,
            test_mode: vendor.testMode ? "true" : "false",
            property_name: property.name,
            property_address: property.address,
            tenant_name: tenant?.name || "tenant",
            unit: order.unit,
            issue: order.issue,
            trade: order.trade,
            urgency: order.severity,
            service_window: order.serviceWindow || order.tenantAvailability?.serviceWindow || order.severity,
            tenant_availability: order.tenantAvailability?.preferredWindows?.join("; ") || order.access || "Needs confirmation",
            access_notes: order.tenantAvailability?.accessNotes || order.access || "Needs confirmation",
            estimate: String(order.estimate),
            work_order_id: order.id,
            inbound_invoice_email: process.env.INBOUND_EMAIL_ADDRESS || "invoices@livingrelay.com",
            invoice_delivery_instructions: order.vendorOutreach?.invoiceDeliveryInstructions || `Send invoice to the property manager, owner, and ${process.env.INBOUND_EMAIL_ADDRESS || "invoices@livingrelay.com"} unless told otherwise.`,
            vendor_questions: vendorCallQuestions.join(" | ")
          }
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.detail || data?.message || `ElevenLabs call failed: ${response.status}`);
    }
    return { vendor: vendor.name, phone: vendor.phone, success: true, ...data };
  } catch (error) {
    return { vendor: vendor.name, phone: vendor.phone, success: false, error: error.message };
  }
}

async function startTwilioRegisteredCall({ vendor, property, tenant, order }) {
  try {
    const baseUrl = process.env.APP_PUBLIC_URL || "http://127.0.0.1:8787";
    const callKey = `${order.id}:${vendor.phone}`;
    const encodedCallKey = encodeURIComponent(callKey);
    const url = `${baseUrl}/api/twilio/elevenlabs/outbound?orderId=${encodeURIComponent(order.id)}&vendorPhone=${encodeURIComponent(vendor.phone)}&vendorName=${encodeURIComponent(vendor.name)}&callKey=${encodedCallKey}`;
    const statusCallback = `${baseUrl}/api/twilio/voice-status?orderId=${encodeURIComponent(order.id)}&callKey=${encodedCallKey}`;
    const call = await startVoiceCall({
      to: vendor.phone,
      url,
      statusCallback
    });
    return {
      vendor: vendor.name,
      phone: vendor.phone,
      success: true,
      provider: "twilio_register",
      callSid: call.sid,
      callKey,
      twilioStatus: call.status,
      mediaStreamUrl: mediaStreamUrl({ orderId: order.id, callKey }),
      summary: "Twilio placed the call; webhook will register it with ElevenLabs when answered."
    };
  } catch (error) {
    return { vendor: vendor.name, phone: vendor.phone, success: false, provider: "twilio_register", error: error.message };
  }
}

export async function registerTwilioCallWithElevenLabs({ fromNumber, toNumber, order, vendorName, callKey }) {
  const property = order ? properties.find((item) => item.id === order.propertyId) : null;
  const tenant = order ? people.find((person) => person.id === order.tenantId) : null;
  const response = await fetch("https://api.elevenlabs.io/v1/convai/twilio/register-call", {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      agent_id: process.env.ELEVENLABS_AGENT_ID,
      from_number: fromNumber,
      to_number: toNumber,
      direction: "outbound",
      conversation_initiation_client_data: {
        dynamic_variables: {
          vendor_name: vendorName || "Vendor",
          property_name: property?.name || "the property",
          property_address: property?.address || "",
          tenant_name: tenant?.name || "tenant",
          unit: order?.unit || "",
          issue: order?.issue || "",
          trade: order?.trade || "",
          urgency: order?.severity || "",
          service_window: order?.serviceWindow || order?.tenantAvailability?.serviceWindow || order?.severity || "",
          tenant_availability: order?.tenantAvailability?.preferredWindows?.join("; ") || order?.access || "Needs confirmation",
          access_notes: order?.tenantAvailability?.accessNotes || order?.access || "Needs confirmation",
          estimate: String(order?.estimate || ""),
          work_order_id: order?.id || "",
          call_key: callKey || "",
          manager_join_policy: "If a property manager joins or is introduced, acknowledge them as the lead maintenance coordinator, defer decisions to them, and continue helping with vendor information capture.",
          inbound_invoice_email: process.env.INBOUND_EMAIL_ADDRESS || "invoices@livingrelay.com",
          invoice_delivery_instructions: order?.vendorOutreach?.invoiceDeliveryInstructions || `Send invoice to the property manager, owner, and ${process.env.INBOUND_EMAIL_ADDRESS || "invoices@livingrelay.com"} unless told otherwise.`,
          vendor_questions: vendorCallQuestions.join(" | ")
        }
      }
    })
  });
  const twiml = await response.text();
  if (!response.ok) {
    throw new Error(twiml || `ElevenLabs register-call failed: ${response.status}`);
  }
  return injectMonitorStream(twiml, { orderId: order?.id, callKey });
}

function injectMonitorStream(twiml, { orderId = "", callKey = "" } = {}) {
  if (!twiml.includes("<Response>")) return twiml;
  const startStream = `<Start><Stream url="${escapeXml(mediaStreamUrl({ orderId, callKey }))}" track="both_tracks" /></Start>`;
  return twiml.replace("<Response>", `<Response>${startStream}`);
}

function mediaStreamUrl({ orderId = "", callKey = "" } = {}) {
  const token = createMediaRelayToken({ orderId, callKey, role: "twilio" });
  if (process.env.TWILIO_MEDIA_STREAM_URL) {
    return `${process.env.TWILIO_MEDIA_STREAM_URL}?orderId=${encodeURIComponent(orderId)}&callKey=${encodeURIComponent(callKey)}&token=${encodeURIComponent(token)}`;
  }
  const base = process.env.APP_PUBLIC_URL || "http://127.0.0.1:8787";
  const wsBase = base.replace(/^https:/, "wss:").replace(/^http:/, "ws:");
  return `${wsBase}/api/media/twilio?orderId=${encodeURIComponent(orderId)}&callKey=${encodeURIComponent(callKey)}&token=${encodeURIComponent(token)}`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildCallOptions(options, { testVendorPhone = "", testOnly = false } = {}) {
  const configuredTestPhone = platformSettings.vendorCallTestNumber || process.env.VENDOR_CALL_TEST_NUMBER || "";
  const phone = testVendorPhone || configuredTestPhone;
  if (!isTestMode({ testVendorPhone, testOnly }) || !phone) return options;
  const first = options[0] || {};
  return [{
    ...first,
    name: `Test vendor (${first.name || "first candidate"})`,
    originalVendorName: first.name || "first candidate",
    phone,
    testMode: true
  }];
}

function isTestMode({ testVendorPhone = "", testOnly = false } = {}) {
  return testOnly || Boolean(testVendorPhone) || platformSettings.vendorCallTestMode !== false || process.env.VENDOR_CALL_TEST_MODE === "true";
}

function normalizePhone(phone = "") {
  return String(phone).replace(/[^\d+]/g, "");
}

function demoCallResult(vendor, order, index) {
  const emergency = order.serviceWindow === "ASAP / emergency";
  const tenantWindows = order.tenantAvailability?.preferredWindows || [];
  const tenantWindow = tenantWindows[index % tenantWindows.length];
  return {
    vendor: vendor.name,
    phone: vendor.phone,
    success: true,
    quote: index === 0 ? (emergency ? "$425 emergency rate + parts" : "$285 callout + parts") : "$225-$375",
    availability: tenantWindow || (emergency && index === 0 ? "Emergency slot in 90 minutes" : index === 1 ? "Tomorrow 9-11 AM" : "Can review photos first"),
    discount: index === 1 ? "10% labor discount for recurring property-manager work" : "No discount confirmed",
    warranty: "30-day labor warranty; manufacturer warranty on parts",
    invoiceEmail: order.vendorOutreach?.invoiceDeliveryInstructions || process.env.INBOUND_EMAIL_ADDRESS || "invoices@livingrelay.com",
    invoiceRecipients: order.vendorOutreach?.invoiceRecipients || [],
    needsPhotos: index > 1,
    status: index > 1 ? "Needs photos" : "Available",
    summary: `Demo outcome generated because live ElevenLabs calls are disabled. Tenant availability shared: ${tenantWindows.join("; ") || order.access || "Needs confirmation"}.`
  };
}
