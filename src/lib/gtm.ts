// Google Tag Manager utility functions
// Provides type-safe dataLayer push for GTM events

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
  }
}

// Ensure dataLayer exists
const getDataLayer = () => {
  window.dataLayer = window.dataLayer || [];
  return window.dataLayer;
};

// Get current page path (without PII)
const getPagePath = () => window.location.pathname + window.location.search;

// Track page view (for SPA navigation)
export const trackPageView = () => {
  getDataLayer().push({
    event: "page_view",
    page_path: getPagePath(),
    page_location: window.location.href,
    page_title: document.title,
  });
};

// Track share button click
export const trackShareClick = (method?: string) => {
  getDataLayer().push({
    event: "share_click",
    method: method || "button",
    page_path: getPagePath(),
  });
};

// Track donate button click
export const trackDonateClick = (location: "footer" | "modal") => {
  getDataLayer().push({
    event: "donate_click",
    location,
    page_path: getPagePath(),
  });
};

// Track prediction change
export const trackPredictionChange = (params: {
  fixture_id: string;
  home_team: string;
  away_team: string;
  round: number;
  result_selected: string;
}) => {
  getDataLayer().push({
    event: "prediction_change",
    fixture_id: params.fixture_id,
    home_team: params.home_team,
    away_team: params.away_team,
    round: params.round,
    result_selected: params.result_selected,
    page_path: getPagePath(),
  });
};
