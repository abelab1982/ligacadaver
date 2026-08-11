/**
 * Single source of truth for the SEO copy of every indexable route.
 *
 * Plain ESM on purpose: it is imported both by the React app (for the <Seo>
 * component) and by scripts/prerender.mjs, which runs in Node after `vite build`
 * and bakes this content into static HTML. Crawlers and social scrapers do not
 * execute React, so without pre-rendering they only ever saw an empty
 * `<div id="root">`.
 */

export const SITE_URL = "https://www.liga1calc.pe";
export const SITE_NAME = "Liga 1 Calc";
export const SEASON = 2026;
// The file is JPEG data; the legacy .png name is kept on disk so links already
// shared on social media keep resolving.
export const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;

/** Teams that get their own indexable page. Keep in sync with src/data/teams.ts. */
export const teams = [
  { slug: "universitario", name: "Universitario", city: "Lima", stadium: "Estadio Monumental" },
  { slug: "alianza-lima", name: "Alianza Lima", city: "Lima", stadium: "Alejandro Villanueva" },
  { slug: "sporting-cristal", name: "Sporting Cristal", city: "Lima", stadium: "Alberto Gallardo" },
  { slug: "melgar", name: "FBC Melgar", city: "Arequipa", stadium: "Monumental de la UNSA" },
  { slug: "cusco-fc", name: "Cusco FC", city: "Cusco", stadium: "Inca Garcilaso de la Vega" },
  { slug: "cienciano", name: "Cienciano", city: "Cusco", stadium: "Inca Garcilaso de la Vega" },
  { slug: "deportivo-garcilaso", name: "Deportivo Garcilaso", city: "Cusco", stadium: "Inca Garcilaso de la Vega" },
  { slug: "adt", name: "ADT", city: "Tarma", stadium: "Unión Tarma" },
  { slug: "sport-huancayo", name: "Sport Huancayo", city: "Huancayo", stadium: "IPD de Huancayo" },
  { slug: "utc", name: "UTC", city: "Cajamarca", stadium: "Héroes de San Ramón" },
  { slug: "comerciantes-unidos", name: "Comerciantes Unidos", city: "Cutervo", stadium: "Juan Maldonado Gamarra" },
  { slug: "fc-cajamarca", name: "FC Cajamarca", city: "Cajamarca", stadium: "Héroes de San Ramón" },
  { slug: "los-chankas", name: "Los Chankas", city: "Andahuaylas", stadium: "Los Chankas" },
  { slug: "atletico-grau", name: "Atlético Grau", city: "Piura", stadium: "Campeones del 36" },
  { slug: "alianza-atletico", name: "Alianza Atlético", city: "Sullana", stadium: "Campeones del 36" },
  { slug: "sport-boys", name: "Sport Boys", city: "Callao", stadium: "Miguel Grau" },
  { slug: "juan-pablo-ii", name: "Juan Pablo II College", city: "Chongoyape", stadium: "Municipal de Chongoyape" },
  { slug: "deportivo-moquegua", name: "Deportivo Moquegua", city: "Moquegua", stadium: "25 de Noviembre" },
];

/** Questions worth ranking for, reused as FAQPage structured data. */
export const homeFaq = [
  {
    question: "¿Cómo funciona la calculadora de la Liga 1 2026?",
    answer:
      "Eliges el marcador de cada partido que falta jugar y la tabla de posiciones se reordena al instante. Los resultados ya jugados se cargan solos desde la fecha en curso, así que solo completas lo que todavía está por definirse en el Apertura, el Clausura y la tabla acumulada.",
  },
  {
    question: "¿Se guardan mis pronósticos si cierro la página?",
    answer:
      "Sí. Tus pronósticos quedan guardados en tu navegador y siguen ahí cuando vuelves a entrar. Además el link de la página incluye tu simulación, así que puedes copiarlo y compartirlo por WhatsApp para que otra persona vea exactamente la misma tabla.",
  },
  {
    question: "¿Qué son los porcentajes de campeón, Libertadores y descenso?",
    answer:
      "Son probabilidades calculadas con miles de simulaciones del campeonato (método Monte Carlo). Partimos de los resultados reales y de los marcadores que tú ya elegiste, y simulamos los partidos restantes usando el promedio de goles a favor y en contra de cada equipo. El porcentaje indica en cuántas de esas simulaciones el equipo terminó campeón, en zona de Libertadores o en zona de descenso.",
  },
  {
    question: "¿Cada cuánto se actualizan los resultados de la Liga 1?",
    answer:
      "Los marcadores se actualizan automáticamente cada 30 segundos, incluso durante los partidos en vivo. Los encuentros ya finalizados quedan bloqueados para que la tabla siempre parta de datos reales.",
  },
  {
    question: "¿Puedo simular la tabla acumulada y no solo el Apertura?",
    answer:
      "Sí. La calculadora tiene tres vistas: Torneo Apertura, Torneo Clausura y tabla acumulada. Los pronósticos que cargas en el Apertura y el Clausura se suman automáticamente en la acumulada, que es la que define los cupos a Copa Libertadores, Copa Sudamericana y el descenso.",
  },
  {
    question: "¿La calculadora es gratis?",
    answer:
      "Sí, es completamente gratis y no necesitas registrarte ni crear una cuenta para usarla.",
  },
];

const homeSections = [
  {
    heading: "Simula el Torneo Apertura, el Clausura y la tabla acumulada",
    paragraphs: [
      "La calculadora carga el fixture completo de la Liga 1 2026 con los resultados reales ya disputados. Tú solo eliges los marcadores de los partidos que faltan y la tabla de posiciones se reordena en vivo: puntos, partidos jugados, diferencia de gol y goles a favor se recalculan con cada cambio.",
      "Puedes moverte entre las tres tablas que importan en el fútbol peruano —Apertura, Clausura y acumulada— sin perder lo que ya pronosticaste. Todo lo que cargas en un torneo se refleja automáticamente en la acumulada.",
    ],
  },
  {
    heading: "Probabilidades reales de campeón, Libertadores y descenso",
    paragraphs: [
      "Además de la tabla, calculamos con miles de simulaciones qué probabilidad tiene cada equipo de salir campeón, de clasificar a la Copa Libertadores o a la Copa Sudamericana, y de pelear el descenso. El modelo usa el rendimiento real de cada club (goles a favor, goles en contra y localía) y respeta los marcadores que tú ya elegiste.",
      "Es la diferencia entre \"si gana estos tres partidos queda primero\" y saber, en números, cuán probable es que eso ocurra.",
    ],
  },
  {
    heading: "Comparte tu tabla y compárala con la de tus amigos",
    paragraphs: [
      "Cada simulación tiene su propio link. Copia la dirección y mándala por WhatsApp: quien la abra verá exactamente los mismos marcadores y la misma tabla que tú. También puedes descargar la tabla como imagen lista para publicar en redes.",
      "Y si te olvidas de guardar el link, no pasa nada: tus pronósticos quedan en tu navegador y siguen ahí la próxima vez que entres.",
    ],
  },
];

/** Zones rendered in the standings legend, reused in the pre-rendered copy. */
export const zones = [
  { label: "Campeón", detail: "1.º puesto" },
  { label: "Copa Libertadores", detail: "2.º a 4.º puesto" },
  { label: "Copa Sudamericana", detail: "5.º a 8.º puesto" },
  { label: "Descenso", detail: "17.º y 18.º puesto" },
];

/** Links pre-rendered into every page so crawlers can reach the whole site. */
export const primaryLinks = [
  { path: "/", label: "Calculadora Liga 1 2026" },
  { path: "/goleadores", label: "Tabla de goleadores" },
  { path: "/pizarra", label: "Pizarra táctica" },
  { path: "/blog", label: "Blog y predicciones" },
];

export const staticRoutes = [
  {
    path: "/",
    title: "Calculadora Liga 1 2026 | Tabla de Posiciones, Acumulada y Pronósticos",
    description:
      "Simula la Liga 1 2026 partido por partido: tabla de posiciones del Apertura, Clausura y acumulada en vivo, con probabilidades de campeón, Libertadores y descenso. Gratis y sin registro.",
    heading: "Calculadora Liga 1 2026: tabla de posiciones y pronósticos",
    intro:
      "Elige los marcadores de los partidos que faltan y mira cómo cambia la tabla de posiciones de la Liga 1 2026 al instante. Apertura, Clausura y tabla acumulada, con resultados en vivo y probabilidades de campeón, Copa Libertadores y descenso.",
    sections: homeSections,
    faq: homeFaq,
    showZones: true,
    priority: "1.0",
    changefreq: "daily",
  },
  {
    path: "/goleadores",
    title: "Goleadores Liga 1 2026 | Tabla de máximos artilleros",
    description:
      "Tabla actualizada de goleadores de la Liga 1 2026: quién lidera la tabla de artilleros del fútbol peruano, con goles, equipo y partidos jugados.",
    heading: "Goleadores de la Liga 1 2026",
    intro:
      "La tabla de máximos artilleros de la Liga 1 2026, actualizada con cada fecha del Torneo Apertura y del Clausura. Revisa quién pelea el título de goleador del fútbol peruano y desde qué equipo lo hace.",
    sections: [
      {
        heading: "Quién va ganando la carrera por el goleador",
        paragraphs: [
          "La tabla ordena a los delanteros por goles anotados en la temporada e incluye su club y los partidos disputados, para que puedas comparar el promedio de gol de cada uno.",
          "Los datos se actualizan junto con los resultados de cada fecha, así que después de cada jornada verás el ranking al día.",
        ],
      },
    ],
    priority: "0.8",
    changefreq: "weekly",
  },
  {
    path: "/pizarra",
    title: "Pizarra Táctica de Fútbol | Arma tu 11 de la Liga 1 2026",
    description:
      "Pizarra táctica gratis para armar alineaciones y jugadas: elige formación, mueve jugadores de los equipos de la Liga 1 2026 y dibuja sobre la cancha.",
    heading: "Pizarra táctica: arma tu once ideal",
    intro:
      "Elige una formación, arrastra a los jugadores sobre la cancha y dibuja las jugadas que quieras explicar. Una pizarra táctica gratis, pensada para el hincha, el entrenador de barrio y el que discute alineaciones en el grupo de WhatsApp.",
    sections: [
      {
        heading: "Cómo usar la pizarra",
        paragraphs: [
          "Selecciona el equipo y la formación que quieras (4-4-2, 4-3-3, 3-5-2 y más), mueve a cada jugador a la posición que prefieras y usa las herramientas de dibujo para marcar movimientos, presiones o pelota parada.",
          "Tu alineación queda guardada en el navegador, así que puedes cerrar la página y retomarla después.",
        ],
      },
    ],
    priority: "0.7",
    changefreq: "monthly",
  },
  {
    path: "/blog",
    title: "Blog Liga 1 2026 | Predicciones y análisis del fútbol peruano",
    description:
      "Análisis fecha por fecha, predicciones y notas sobre la Liga 1 2026: quién pelea el título, la clasificación a copas y el descenso del fútbol peruano.",
    heading: "Blog: predicciones y análisis de la Liga 1 2026",
    intro:
      "Análisis partido por partido de cada fecha del Torneo Apertura y del Clausura, con las predicciones que después puedes cargar tú mismo en la calculadora.",
    sections: [],
    priority: "0.9",
    changefreq: "daily",
  },
];

const teamRoute = (team) => ({
  path: `/equipos/${team.slug}`,
  title: `${team.name} 2026 | Posición, fixture y resultados en la Liga 1`,
  description: `${team.name} en la Liga 1 2026: posición en la tabla, puntos, próximos partidos, últimos resultados y datos del club. Simula sus partidos restantes en la calculadora.`,
  heading: `${team.name} en la Liga 1 2026`,
  intro: `Posición en la tabla, puntos, próximos partidos y últimos resultados de ${team.name} en la Liga 1 2026. ${team.name} juega de local en ${team.stadium} (${team.city}).`,
  sections: [
    {
      heading: `Fixture y resultados de ${team.name}`,
      paragraphs: [
        `Consulta el calendario completo de ${team.name} en el Torneo Apertura y el Clausura, con los partidos ya disputados y los que faltan por jugar.`,
        `Desde la calculadora puedes elegir el marcador de cada partido pendiente de ${team.name} y ver al instante en qué posición terminaría de la tabla acumulada, con qué probabilidad pelea el título y cuánto riesgo de descenso tiene.`,
      ],
    },
  ],
  priority: "0.7",
  changefreq: "weekly",
});

export const teamRoutes = teams.map(teamRoute);

/** Short team id (as used in fixture.json) -> display name and slug. */
export const teamsById = {
  uni: { name: "Universitario", slug: "universitario" },
  ali: { name: "Alianza Lima", slug: "alianza-lima" },
  cri: { name: "Sporting Cristal", slug: "sporting-cristal" },
  mel: { name: "FBC Melgar", slug: "melgar" },
  cus: { name: "Cusco FC", slug: "cusco-fc" },
  cie: { name: "Cienciano", slug: "cienciano" },
  gar: { name: "Deportivo Garcilaso", slug: "deportivo-garcilaso" },
  adt: { name: "ADT", slug: "adt" },
  shu: { name: "Sport Huancayo", slug: "sport-huancayo" },
  utc: { name: "UTC", slug: "utc" },
  com: { name: "Comerciantes Unidos", slug: "comerciantes-unidos" },
  fcc: { name: "FC Cajamarca", slug: "fc-cajamarca" },
  cha: { name: "Los Chankas", slug: "los-chankas" },
  gra: { name: "Atlético Grau", slug: "atletico-grau" },
  aas: { name: "Alianza Atlético", slug: "alianza-atletico" },
  sba: { name: "Sport Boys", slug: "sport-boys" },
  jpi: { name: "Juan Pablo II College", slug: "juan-pablo-ii" },
  moq: { name: "Deportivo Moquegua", slug: "deportivo-moquegua" },
};

export const TOTAL_ROUNDS = 17;

export const tournaments = {
  apertura: { code: "A", label: "Torneo Apertura", short: "Apertura" },
  clausura: { code: "C", label: "Torneo Clausura", short: "Clausura" },
};

const teamName = (id) => (teamsById[id] ? teamsById[id].name : id);

/**
 * One indexable page per matchday.
 *
 * This is the long-tail play: nobody searches "calculadora liga 1" as often as
 * they search "tabla liga 1 fecha 15" or "resultados fecha 15 apertura", and a
 * single-page app has nothing to rank for those. Each page gets its own title,
 * description and — for the Apertura, whose calendar ships in fixture.json —
 * the actual matchups written into the HTML, so no two pages read alike.
 *
 * `pairings` is supplied by the caller: scripts/prerender.mjs reads
 * fixture.json from disk, the app imports it directly.
 */
export const buildRoundRoute = (tournamentSlug, round, pairings = []) => {
  const tournament = tournaments[tournamentSlug];
  const matchList = pairings
    .map((m) => `${teamName(m.homeId)} vs ${teamName(m.awayId)}`)
    .join(", ");

  const paragraphs = [
    matchList
      ? `Los partidos de la Fecha ${round} del ${tournament.label} son: ${matchList}.`
      : `Acá encuentras los partidos de la Fecha ${round} del ${tournament.label} con sus marcadores, y la tabla de posiciones tal como queda después de la jornada.`,
    `Elige el resultado de cada partido que todavía no se juega y la tabla se reordena al instante. Los encuentros ya disputados se cargan solos y quedan bloqueados, así que la simulación siempre parte de datos reales.`,
  ];

  return {
    path: `/${tournamentSlug}/fecha-${round}`,
    tournamentSlug,
    round,
    title: `Fecha ${round} ${tournament.short} 2026 | Partidos, resultados y tabla de la Liga 1`,
    description: `Partidos y resultados de la Fecha ${round} del ${tournament.label} 2026 de la Liga 1, con la tabla de posiciones actualizada. Simula los marcadores que faltan y mira cómo queda.`,
    heading: `Fecha ${round} del ${tournament.label} 2026`,
    intro: `Todos los partidos de la Fecha ${round} del ${tournament.label} de la Liga 1 2026, con resultados en vivo y la tabla de posiciones al día. Cambia cualquier marcador para ver cómo se mueve la tabla.`,
    sections: [
      { heading: `Partidos de la Fecha ${round}`, paragraphs },
    ],
    priority: "0.8",
    changefreq: "daily",
  };
};

/**
 * All 34 matchday routes. Pass the fixture.json payload to bake the real
 * Apertura matchups in; the Clausura calendar only lives in the database, so
 * those pages ship the generic copy and the app fills in the live fixture.
 */
export const buildRoundRoutes = (fixtureData) => {
  const byRound = new Map();
  if (fixtureData && Array.isArray(fixtureData.matches)) {
    for (const entry of fixtureData.matches) byRound.set(entry.round, entry.matches);
  }

  const routes = [];
  for (const slug of Object.keys(tournaments)) {
    for (let round = 1; round <= TOTAL_ROUNDS; round += 1) {
      routes.push(
        buildRoundRoute(slug, round, slug === "apertura" ? byRound.get(round) ?? [] : [])
      );
    }
  }
  return routes;
};

/**
 * Routes known without any data. scripts/prerender.mjs replaces the matchday
 * ones with the fixture-aware version before writing the HTML.
 */
export const allRoutes = [...staticRoutes, ...teamRoutes, ...buildRoundRoutes(null)];

export const findRoute = (path) => allRoutes.find((route) => route.path === path);
