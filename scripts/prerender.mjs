/**
 * Post-build pre-rendering.
 *
 * `vite build` emits a single index.html whose body is `<div id="root"></div>`.
 * That is what Googlebot, Bing, WhatsApp, Facebook and Twitter fetch first, and
 * social scrapers never run JavaScript at all — so today every URL on the site
 * shares one title and shows no content.
 *
 * This script writes one static HTML file per route with the correct title,
 * description, canonical, Open Graph tags, JSON-LD, and a real HTML rendering of
 * the page copy inside `#root`. React replaces that content on mount (createRoot
 * clears the container), so users see the app exactly as before while crawlers
 * get a fully-formed document on the first byte.
 *
 * Vercel serves a matching static file before applying the SPA rewrite, and
 * `cleanUrls` maps /goleadores.html to /goleadores, so client-side routing is
 * untouched.
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_IMAGE,
  SITE_NAME,
  SITE_URL,
  allRoutes,
  homeFaq,
  primaryLinks,
  teams,
  zones,
} from "../src/data/seoRoutes.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(here, "..", "dist");
const blogDir = resolve(here, "..", "src", "data", "blog");

/**
 * Blog posts live as TypeScript modules, which Node can't import here, so we
 * lift their front-matter with a narrow regex. A post that doesn't match is
 * simply skipped — it still works in the app, it just isn't pre-rendered.
 */
const readBlogRoutes = async () => {
  let files;
  try {
    files = await readdir(blogDir);
  } catch {
    return [];
  }

  const field = (source, name) => {
    const match = source.match(new RegExp(`\\n\\s*${name}:\\s*"((?:[^"\\\\]|\\\\.)*)"`));
    return match ? match[1].replace(/\\"/g, '"') : null;
  };

  const routes = [];
  for (const file of files) {
    if (!file.endsWith(".ts") || file === "index.ts" || file === "types.ts") continue;
    const source = await readFile(join(blogDir, file), "utf8");
    if (field(source, "status") !== "published") continue;

    const slug = field(source, "slug");
    const title = field(source, "title");
    const description = field(source, "description");
    if (!slug || !title || !description) continue;

    routes.push({
      path: `/blog/${slug}`,
      title: `${title} | ${SITE_NAME}`,
      description,
      heading: title,
      intro: description,
      sections: [],
      priority: "0.7",
      changefreq: "monthly",
    });
  }
  return routes;
};

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** JSON-LD must not be able to break out of its own <script> tag. */
const escapeJsonLd = (value) => JSON.stringify(value).replace(/</g, "\\u003c");

const organization = {
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
};

const webSite = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  inLanguage: "es-PE",
  publisher: organization,
};

const webApplication = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Calculadora Liga 1 2026",
  url: SITE_URL,
  applicationCategory: "SportsApplication",
  operatingSystem: "Any",
  inLanguage: "es-PE",
  description:
    "Calculadora y simulador de la tabla de posiciones de la Liga 1 2026 del fútbol peruano, con Torneo Apertura, Clausura, tabla acumulada y probabilidades de campeón y descenso.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "PEN" },
  publisher: organization,
};

const faqPage = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: homeFaq.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

const breadcrumbs = (route) => {
  const items = [{ name: "Inicio", item: `${SITE_URL}/` }];
  if (route.path !== "/") {
    if (route.path.startsWith("/equipos/")) {
      items.push({ name: "Equipos", item: `${SITE_URL}/` });
    }
    items.push({ name: route.heading, item: `${SITE_URL}${route.path}` });
  }
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((entry, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: entry.name,
      item: entry.item,
    })),
  };
};

const jsonLdFor = (route) => {
  const graph = [webSite, breadcrumbs(route)];
  if (route.path === "/") graph.push(webApplication, faqPage);
  return graph;
};

const renderSections = (sections = []) =>
  sections
    .map(
      (section) =>
        `<section><h2>${escapeHtml(section.heading)}</h2>${section.paragraphs
          .map((text) => `<p>${escapeHtml(text)}</p>`)
          .join("")}</section>`
    )
    .join("");

const renderZones = (route) =>
  route.showZones
    ? `<section><h2>Qué define cada zona de la tabla</h2><ul>${zones
        .map((zone) => `<li><strong>${escapeHtml(zone.label)}:</strong> ${escapeHtml(zone.detail)}</li>`)
        .join("")}</ul></section>`
    : "";

const renderFaq = (route) =>
  route.faq && route.faq.length > 0
    ? `<section><h2>Preguntas frecuentes</h2>${route.faq
        .map(
          (item) =>
            `<h3>${escapeHtml(item.question)}</h3><p>${escapeHtml(item.answer)}</p>`
        )
        .join("")}</section>`
    : "";

const renderTeamIndex = (route) =>
  route.path === "/"
    ? `<nav aria-label="Equipos de la Liga 1 2026"><h2>Equipos de la Liga 1 2026</h2><ul>${teams
        .map(
          (team) =>
            `<li><a href="/equipos/${team.slug}">${escapeHtml(team.name)}</a></li>`
        )
        .join("")}</ul></nav>`
    : "";

const renderNav = () =>
  `<nav aria-label="Secciones"><ul>${primaryLinks
    .map((link) => `<li><a href="${link.path}">${escapeHtml(link.label)}</a></li>`)
    .join("")}</ul></nav>`;

/**
 * Static copy of the page, rendered inside #root. React wipes the container on
 * mount, so this is never visible alongside the app.
 */
const renderBody = (route) =>
  [
    '<div id="prerender-content">',
    `<h1>${escapeHtml(route.heading)}</h1>`,
    `<p>${escapeHtml(route.intro)}</p>`,
    renderSections(route.sections),
    renderZones(route),
    renderFaq(route),
    renderTeamIndex(route),
    renderNav(),
    "</div>",
  ].join("");

const renderHead = (route) => {
  const url = `${SITE_URL}${route.path}`;
  const type = route.path.startsWith("/blog/") ? "article" : "website";
  return [
    `<title>${escapeHtml(route.title)}</title>`,
    `<meta name="description" content="${escapeHtml(route.description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:title" content="${escapeHtml(route.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(route.description)}" />`,
    `<meta property="og:image" content="${DEFAULT_IMAGE}" />`,
    `<meta property="og:image:type" content="image/jpeg" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:locale" content="es_PE" />`,
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:url" content="${url}" />`,
    `<meta name="twitter:title" content="${escapeHtml(route.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(route.description)}" />`,
    `<meta name="twitter:image" content="${DEFAULT_IMAGE}" />`,
    `<script type="application/ld+json">${escapeJsonLd(jsonLdFor(route))}</script>`,
  ].join("\n    ");
};

/** Strip the tags the template ships with so we never emit duplicates. */
const stripTemplateSeo = (html) =>
  html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, "")
    .replace(/\s*<meta\s+name="description"[^>]*>/gi, "")
    .replace(/\s*<link\s+rel="canonical"[^>]*>/gi, "")
    .replace(/\s*<meta\s+property="og:[^"]*"[^>]*>/gi, "")
    .replace(/\s*<meta\s+name="twitter:[^"]*"[^>]*>/gi, "");

const PLACEHOLDER = "<!--seo-head-->";

const buildPage = (template, route) => {
  const withHead = stripTemplateSeo(template).replace(
    /<\/head>/i,
    `  ${renderHead(route)}\n  </head>`
  );
  const body = renderBody(route);
  const withBody = withHead.replace(
    /<div id="root">\s*<\/div>/i,
    `<div id="root">${body}</div>`
  );
  if (withBody === withHead) {
    throw new Error('Could not find <div id="root"></div> in the built index.html');
  }
  return withBody;
};

const outputPathFor = (path) =>
  path === "/" ? join(distDir, "index.html") : join(distDir, `${path.slice(1)}.html`);

const main = async () => {
  const templatePath = join(distDir, "index.html");
  const template = await readFile(templatePath, "utf8");

  if (template.includes(PLACEHOLDER)) {
    throw new Error("Unexpected placeholder in built index.html");
  }

  const routes = [...allRoutes, ...(await readBlogRoutes())];

  for (const route of routes) {
    const outputPath = outputPathFor(route.path);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, buildPage(template, route), "utf8");
  }

  // 404s must not be pre-rendered as one of the real routes; ship the bare shell.
  await writeFile(join(distDir, "404.html"), stripTemplateSeo(template).replace(
    /<\/head>/i,
    `  <title>Página no encontrada | ${escapeHtml(SITE_NAME)}</title>\n    <meta name="robots" content="noindex, follow" />\n  </head>`
  ), "utf8");

  await writeSitemap(routes);

  console.log(`Pre-rendered ${routes.length} routes into dist/`);
};

/** The sitemap is generated from the same route table, so it can never drift. */
const writeSitemap = async (allRoutes) => {
  const today = new Date().toISOString().slice(0, 10);
  const urls = allRoutes
    .map(
      (route) =>
        `  <url>\n    <loc>${SITE_URL}${route.path === "/" ? "/" : route.path}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${route.changefreq}</changefreq>\n    <priority>${route.priority}</priority>\n  </url>`
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  await writeFile(join(distDir, "sitemap.xml"), xml, "utf8");
};

main().catch((error) => {
  console.error("[prerender] failed:", error);
  process.exit(1);
});
