const stripeApiBase = "https://api.stripe.com/v1";
export const dispatchFeeCents = Number(process.env.DISPATCH_FEE_CENTS || 2500);
export const dispatchFeeDescription = "LivingRelay vendor dispatch coordination";

export function stripeBillingStatus() {
  const missing = [
    ["STRIPE_SECRET_KEY", process.env.STRIPE_SECRET_KEY],
    ["APP_BASE_URL", process.env.APP_BASE_URL]
  ].filter(([, value]) => !value).map(([key]) => key);
  return {
    configured: missing.length === 0,
    missing,
    dispatchFeeCents,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || ""
  };
}

export async function createStripeSetupSession({ account, successUrl, cancelUrl }) {
  requireStripeKey();
  if (!account.stripeCustomerId) {
    const customer = await createStripeCustomer({ account });
    account.stripeCustomerId = customer.id;
  }
  const baseUrl = process.env.APP_BASE_URL;
  return stripeRequest("/checkout/sessions", {
    mode: "setup",
    customer: account.stripeCustomerId,
    success_url: successUrl || `${baseUrl}/?billing=setup-complete`,
    cancel_url: cancelUrl || `${baseUrl}/?billing=setup-cancelled`,
    "metadata[accountId]": account.id,
    "setup_intent_data[metadata][accountId]": account.id
  });
}

export async function createStripePortalSession({ account, returnUrl }) {
  requireStripe(account);
  return stripeRequest("/billing_portal/sessions", {
    customer: account.stripeCustomerId,
    return_url: returnUrl || process.env.APP_BASE_URL
  });
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
    auto_advance: "true",
    collection_method: "charge_automatically",
    description: `${dispatchFeeDescription}: ${order.id}`,
    "metadata[accountId]": account.id,
    "metadata[propertyId]": property.id,
    "metadata[workOrderId]": order.id
  }, `${idempotencyKey}-invoice`);
  return invoice;
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

function requireStripe(account) {
  requireStripeKey();
  if (!account?.stripeCustomerId) throw new Error("Account needs a saved Stripe customer or setup session first.");
}

function requireStripeKey() {
  const status = stripeBillingStatus();
  if (!status.configured) throw new Error(`Stripe is missing: ${status.missing.join(", ")}`);
}
