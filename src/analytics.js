const GA_MEASUREMENT_IDS_BY_HOST = {
  "staging.livingrelay.com": "G-4EPQK851N0",
  "livingrelay.com": "G-JK9RC1VEXR",
  "www.livingrelay.com": "G-JK9RC1VEXR"
};

function gaMeasurementId() {
  const configuredId = (import.meta.env.VITE_GA_MEASUREMENT_ID || "").trim();
  if (configuredId) return configuredId;
  if (typeof window === "undefined") return "";
  return GA_MEASUREMENT_IDS_BY_HOST[window.location.hostname.toLowerCase()] || "";
}

let initialized = false;

export function analyticsEnabled() {
  return Boolean(gaMeasurementId()) && typeof window !== "undefined" && typeof document !== "undefined";
}

export function initializeAnalytics() {
  if (!analyticsEnabled() || initialized) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  const script = document.createElement("script");
  script.async = true;
  const measurementId = gaMeasurementId();
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);

  window.gtag("js", new Date());
  window.gtag("config", measurementId, {
    send_page_view: false,
    cookie_flags: "SameSite=Lax;Secure"
  });

  initialized = true;
}

export function trackPageView(path = `${window.location.pathname}${window.location.search}${window.location.hash}`) {
  if (!analyticsEnabled()) return;
  initializeAnalytics();
  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title
  });
}
