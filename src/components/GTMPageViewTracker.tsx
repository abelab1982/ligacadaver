import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "@/lib/gtm";

/**
 * Component that tracks page views on SPA navigation
 * Must be placed inside BrowserRouter
 */
export const GTMPageViewTracker = () => {
  const location = useLocation();

  useEffect(() => {
    // Track page view on route change
    trackPageView();
  }, [location.pathname, location.search]);

  return null;
};
