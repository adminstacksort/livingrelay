const GA_MEASUREMENT_ID = (import.meta.env.VITE_GA_MEASUREMENT_ID || "").trim();

let initialized = false;

export function analyticsEnabled() {
  return Boolean(GA_MEASUREMENT_ID) && typeof window !== "undefined" && typeof document !== "undefined";
}

export function initializeAnalytics() {
  if (!analyticsEnabled() || initialized) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
  document.head.appendChild(script);

  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID, {
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
