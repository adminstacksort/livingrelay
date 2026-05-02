const stripeApiBase = "https://api.stripe.com/v1";
export const dispatchFeeCents = Number(process.env.DISPATCH_FEE_CENTS || 2500);
export const ownerSubscriptionCents = Number(process.env.OWNER_SUBSCRIPTION_AMOUNT_CENTS || 9900);
export const dispatchFeeDescription = "LivingRelay vendor dispatch coordination";
export const ownerSubscriptionName = "LivingRelay Owner Subscription";

export function stripeBillingStatus() {
  const missing = [
    ["STRIPE_SECRET_KEY", process.env.STRIPE_SECRET_KEY],
    ["APP_PUBLIC_URL", appBaseUrl()]
  ].filter(([, value]) => !value).map(([key]) => key);
  return {
    configured: missing.length === 0,
    missing,
    dispatchFeeCents,
    ownerSubscriptionCents,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || ""
  };
}

export async function createStripeSetupSession({ account, successUrl, cancelUrl }) {
  requireStripeKey();
  if (!account.stripeCustomerId) {
    const customer = await createStripeCustomer({ account });
    account.stripeCustomerId = customer.id;
  }
  const baseUrl = appBaseUrl();
  return createCheckoutSessionWithCustomerRetry(account, {
    mode: "setup",
    currency: "usd",
    customer: account.stripeCustomerId,
    success_url: checkoutReturnUrl(successUrl || baseUrl, "setup-complete"),
    cancel_url: checkoutReturnUrl(cancelUrl || baseUrl, "setup-cancelled"),
    "metadata[accountId]": account.id,
    "setup_intent_data[metadata][accountId]": account.id
  });
}

export async function createStripePortalSession({ account, returnUrl }) {
  requireStripe(account);
  return stripeRequest("/billing_portal/sessions", {
    customer: account.stripeCustomerId,
    return_url: returnUrl || appBaseUrl()
  });
}

export async function createStripeOwnerSubscriptionSession({ account, property, successUrl, cancelUrl }) {
  requireStripeKey();
  if (!account.stripeCustomerId) {
    const customer = await createStripeCustomer({ account });
    account.stripeCustomerId = customer.id;
  }
  const baseUrl = appBaseUrl();
  return createCheckoutSessionWithCustomerRetry(account, {
    mode: "subscription",
    customer: account.stripeCustomerId,
    success_url: checkoutReturnUrl(successUrl || baseUrl, "owner-subscription-complete"),
    cancel_url: checkoutReturnUrl(cancelUrl || baseUrl, "owner-subscription-cancelled"),
    "line_items[0][quantity]": 1,
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": ownerSubscriptionCents,
    "line_items[0][price_data][recurring][interval]": "year",
    "line_items[0][price_data][product_data][name]": ownerSubscriptionName,
    "line_items[0][price_data][product_data][description]": "Annual owner tax packet exports for rental property maintenance expenses.",
    "metadata[accountId]": account.id,
    "metadata[propertyId]": property?.id || "",
    "metadata[billingProduct]": "owner_subscription",
    "subscription_data[metadata][accountId]": account.id,
    "subscription_data[metadata][propertyId]": property?.id || "",
    "subscription_data[metadata][billingProduct]": "owner_subscription"
  });
}

async function createCheckoutSessionWithCustomerRetry(account, fields) {
  try {
    return await stripeRequest("/checkout/sessions", fields);
  } catch (error) {
    if (!/no such customer/i.test(error.message || "")) throw error;
    const customer = await createStripeCustomer({ account });
    account.stripeCustomerId = customer.id;
    return stripeRequest("/checkout/sessions", {
      ...fields,
      customer: account.stripeCustomerId
    });
  }
}

export async function chargeStripeDispatchFee({ account, property, order }) {
  requireStripe(account);
  const idempotencyKey = `dispatch-fee-${order.id}`;
  await stripeRequest("/invoiceitems", {
    customer: account.stripeCustomerId,
    amount: dispatchFeeCents,
    currency: "usd",
    description: `${dispatchFeeDescription}: ${property.name} ${order.id}`,
    "metadata[accountId]": account.id,
    "metadata[propertyId]": property.id,
    "metadata[workOrderId]": order.id
  }, idempotencyKey);
  const invoice = await stripeRequest("/invoices", {
    customer: account.stripeCustomerId,
    auto_advance: "false",
    collection_method: "charge_automatically",
    description: `${dispatchFeeDescription}: ${order.id}`,
    "metadata[accountId]": account.id,
    "metadata[propertyId]": property.id,
    "metadata[workOrderId]": order.id
  }, `${idempotencyKey}-invoice`);
  const finalized = await stripeRequest(`/invoices/${invoice.id}/finalize`, {}, `${idempotencyKey}-finalize`);
  return stripeRequest(`/invoices/${invoice.id}/pay`, {}, `${idempotencyKey}-pay`).catch((error) => {
    error.stripeInvoice = finalized;
    throw error;
  });
}

export async function setCustomerDefaultPaymentMethod({ customerId, paymentMethodId }) {
  requireStripeKey();
  if (!customerId || !paymentMethodId) return null;
  return stripeRequest(`/customers/${customerId}`, {
    "invoice_settings[default_payment_method]": paymentMethodId
  });
}

export async function retrieveStripeSetupIntent(setupIntentId) {
  requireStripeKey();
  if (!setupIntentId) return null;
  return stripeGet(`/setup_intents/${setupIntentId}`);
}

export async function retrieveStripeCheckoutSession(sessionId) {
  requireStripeKey();
  if (!sessionId) return null;
  return stripeGet(`/checkout/sessions/${sessionId}`);
}

async function createStripeCustomer({ account }) {
  return stripeRequest("/customers", {
    name: account.name,
    "metadata[accountId]": account.id
  });
}

async function stripeRequest(path, fields, idempotencyKey) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null && value !== "") body.append(key, String(value));
  }
  const response = await fetch(`${stripeApiBase}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {})
    },
    body
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "Stripe request failed");
  }
  return data;
}

async function stripeGet(path) {
  const response = await fetch(`${stripeApiBase}${path}`, {
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`
    }
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "Stripe request failed");
  }
  return data;
}

function requireStripe(account) {
  requireStripeKey();
  if (!account?.stripeCustomerId) throw new Error("Account needs a saved Stripe customer or setup session first.");
}

function requireStripeKey() {
  const status = stripeBillingStatus();
  if (!status.configured) throw new Error(`Stripe is missing: ${status.missing.join(", ")}`);
}

function appBaseUrl() {
  return process.env.APP_BASE_URL || process.env.APP_PUBLIC_URL || "";
}

function checkoutReturnUrl(rawUrl, billingStatus) {
  const url = safeReturnUrl(rawUrl || appBaseUrl());
  url.searchParams.set("billing", billingStatus);
  if (billingStatus.endsWith("-complete")) url.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
  return url.toString();
}

function safeReturnUrl(rawUrl) {
  const base = new URL(appBaseUrl());
  try {
    const url = new URL(rawUrl || base.toString(), base);
    return url.origin === base.origin ? url : base;
  } catch {
    return base;
  }
}
