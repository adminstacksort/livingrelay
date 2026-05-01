import { people, properties, vendors, workOrders } from "./data.js";

export async function startVendorQuoteCalls(orderId) {
  const order = workOrders.find((item) => item.id === orderId);
  if (!order) return { started: false, calls: [], reason: "Work order not found" };

  if (process.env.ENABLE_VENDOR_CALLS !== "true") {
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

  const options = order.vendorOptions?.length
    ? order.vendorOptions
    : vendors.filter((vendor) => vendor.trade === order.trade);
  const property = properties.find((item) => item.id === order.propertyId);
  const tenant = people.find((person) => person.id === order.tenantId);

  const calls = [];
  for (const option of options.slice(0, 5)) {
    const result = await startOutboundCall({
      vendor: option,
      property,
      tenant,
      order
    });
    calls.push(result);
  }
  order.timeline.push({
    label: "ElevenLabs quote calls started",
    detail: calls.map((call) => `${call.vendor}: ${call.success ? call.callSid || call.conversation_id : call.error}`).join("; "),
    stamp: new Date().toISOString()
  });
  return { started: true, calls };
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
            property_name: property.name,
            property_address: property.address,
            tenant_name: tenant?.name || "tenant",
            unit: order.unit,
            issue: order.issue,
            trade: order.trade,
            urgency: order.severity,
            estimate: String(order.estimate),
            work_order_id: order.id
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
