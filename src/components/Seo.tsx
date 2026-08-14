import { useEffect } from "react";

export const SITE_URL = "https://www.liga1calc.pe";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;

interface SeoProps {
  title: string;
  description: string;
  /** Path only, e.g. "/goleadores". Defaults to the current path. */
  path?: string;
  image?: string;
  /** "website" for tools and hubs, "article" for blog posts. */
  type?: "website" | "article";
  /** Extra JSON-LD injected alongside the page metadata. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  noindex?: boolean;
}

const upsertMeta = (selector: string, attribute: "name" | "property", key: string, content: string) => {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
};

const upsertLink = (rel: string, href: string) => {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
};

const JSON_LD_ID = "seo-json-ld";

/**
 * Per-route metadata for a single-page app.
 *
 * The build also pre-renders these exact tags into static HTML (see
 * scripts/prerender.mjs) so crawlers and social scrapers — which do not run
 * React — get the right title, description and canonical on the first byte.
 * This component keeps them correct during client-side navigation.
 */
export const Seo = ({
  title,
  description,
  path,
  image = DEFAULT_IMAGE,
  type = "website",
  jsonLd,
  noindex = false,
}: SeoProps) => {
  const serializedJsonLd = jsonLd ? JSON.stringify(jsonLd) : "";

  useEffect(() => {
    const url = `${SITE_URL}${path ?? window.location.pathname}`;

    document.title = title;
    upsertMeta('meta[name="description"]', "name", "description", description);
    upsertMeta('meta[name="robots"]', "name", "robots", noindex ? "noindex, nofollow" : "index, follow");
    upsertLink("canonical", url);

    upsertMeta('meta[property="og:title"]', "property", "og:title", title);
    upsertMeta('meta[property="og:description"]', "property", "og:description", description);
    upsertMeta('meta[property="og:url"]', "property", "og:url", url);
    upsertMeta('meta[property="og:image"]', "property", "og:image", image);
    upsertMeta('meta[property="og:type"]', "property", "og:type", type);

    upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
    upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
    upsertMeta('meta[name="twitter:url"]', "name", "twitter:url", url);
    upsertMeta('meta[name="twitter:image"]', "name", "twitter:image", image);
  }, [title, description, path, image, type, noindex]);

  useEffect(() => {
    const existing = document.getElementById(JSON_LD_ID);
    if (!serializedJsonLd) {
      existing?.remove();
      return;
    }
    const script = existing ?? document.createElement("script");
    script.id = JSON_LD_ID;
    script.setAttribute("type", "application/ld+json");
    script.textContent = serializedJsonLd;
    if (!existing) document.head.appendChild(script);

    return () => {
      document.getElementById(JSON_LD_ID)?.remove();
    };
  }, [serializedJsonLd]);

  return null;
};
