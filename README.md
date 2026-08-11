# Liga 1 Calc — liga1calc.pe

Calculadora y simulador de la tabla de posiciones de la **Liga 1 2026** del fútbol peruano.
Torneo Apertura, Clausura y tabla acumulada, con resultados en vivo, pronósticos que se
guardan y se comparten, y probabilidades de campeón / Libertadores / descenso.

Producción: <https://www.liga1calc.pe> (Vercel)

---

## Stack

| Capa | Tecnología |
| --- | --- |
| Front-end | React 18 + TypeScript + Vite |
| UI | Tailwind CSS + shadcn/ui + framer-motion |
| Datos | Supabase (Postgres + Edge Functions) |
| Hosting | Vercel (SPA + HTML pre-renderizado) |
| Analítica | Google Tag Manager / GA4 |

## Desarrollo

```sh
npm install
npm run dev        # http://localhost:8080
npm run build      # vite build + pre-render
npm run preview
npm run lint
```

### Variables de entorno

| Variable | Obligatoria | Para qué sirve |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | sí | Origen de fixtures, goleadores y H2H |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | sí | Clave anónima de Supabase |
| `VITE_ADSENSE_CLIENT` | no | `ca-pub-…`. Sin ella no se carga ni un byte de AdSense |
| `VITE_ADSENSE_SLOT_FOOTER` | no | ID del bloque de anuncio del footer |

---

## Cómo está armado

### Motor de la tabla — `src/hooks/useLiveLeagueEngine.ts`

Mezcla el fixture local (`src/data/fixture.json`, solo Apertura) con lo que hay en
Supabase, que siempre gana. Los partidos `FT`/`LIVE` son datos reales y quedan
bloqueados; los `NS` son los que el usuario puede pronosticar. Los fixtures se
refrescan cada 30 s.

### Pronósticos: se guardan y se comparten — `src/lib/predictions.ts`

Un pronóstico se codifica en 9 caracteres:

```
torneo(1) + idLocal(3) + idVisita(3) + golesLocal(1 hex) + golesVisita(1 hex)
    A     +    uni      +    ali      +        2         +        1          => "Auniali21"
```

Cada emparejamiento se juega una sola vez por torneo, así que
`(torneo, local, visita)` identifica al partido durante toda la temporada **sin
depender del id de la base de datos** — los pronósticos sobreviven a una
reimportación del fixture. Una fecha completa (9 partidos) son 81 caracteres.

Ese mismo código se guarda en `localStorage` (`l1c:preds:2026:v1`) y se refleja en
la query string (`?p=…`) con `replaceState`. Consecuencias:

- cerrar la pestaña ya no borra la simulación;
- copiar la URL es compartir la tabla exacta: quien la abra ve lo mismo;
- si hay código en la URL, gana sobre lo guardado (un link compartido siempre
  muestra lo que se compartió).

### Probabilidades — `src/lib/simulation.ts`

Simulación Monte Carlo (5.000 iteraciones) sobre los partidos que faltan:

1. Se calcula un multiplicador de ataque y defensa por equipo a partir de sus goles
   reales, regresado a la media de la liga con 6 partidos ficticios para que un
   equipo con 3 fechas jugadas no se trate como una certeza.
2. Los goles de cada partido pendiente se muestrean con una Poisson independiente,
   con ventaja de localía.
3. Lo que el usuario ya pronosticó se toma como resultado definitivo, no se simula.
4. Se ordena la tabla con los mismos criterios de desempate que la vista (puntos,
   diferencia de gol, goles a favor) y se cuenta en cuántas simulaciones cada equipo
   terminó 1.º, entre los 4 primeros, entre el 5.º y el 8.º, y en los 2 últimos.

El PRNG tiene semilla fija: la misma entrada siempre devuelve el mismo número, así
que la columna no parpadea entre renders. Una temporada entera sin jugar
(153 partidos × 5.000 iteraciones) tarda ~130 ms, y baja rápido a medida que avanza
el campeonato. Se ejecuta con debounce de 180 ms fuera del render (`useOdds`).

La columna se oculta sola cuando ya no queda nada por simular.

### SEO: pre-renderizado — `scripts/prerender.mjs`

Vite emite un solo `index.html` cuyo body es `<div id="root"></div>`. Eso es lo que
recibían Googlebot, WhatsApp, Facebook y Twitter: **una página vacía, con el mismo
título para las 23 URLs del sitio**, y los scrapers sociales ni siquiera ejecutan
JavaScript.

Después de `vite build`, el script escribe un HTML estático por ruta con:

- `<title>`, `<meta description>` y `<link canonical>` propios;
- Open Graph y Twitter Cards apuntando a la URL correcta;
- JSON-LD (`WebSite`, `WebApplication`, `FAQPage`, `BreadcrumbList`, `SportsTeam`,
  `BlogPosting`);
- el texto real de la página dentro de `#root`, más enlaces internos a todas las
  secciones y a las 18 páginas de equipo.

React limpia `#root` al montar, así que el usuario ve exactamente la misma app.
Vercel sirve el archivo estático antes de aplicar el rewrite del SPA y `cleanUrls`
mapea `/goleadores.html` a `/goleadores`, así que el ruteo del cliente no cambia.

El `sitemap.xml` se genera del mismo listado de rutas, con lo cual no puede quedar
desactualizado. Los textos viven en `src/data/seoRoutes.mjs` (ESM plano porque lo
importan tanto la app como el script de Node).

Durante la navegación del cliente, `src/components/Seo.tsx` mantiene los mismos
tags correctos.

### Monetización

- **Afiliado Betsson** y **QR de Yape** en el footer (`src/components/Footer.tsx`).
- **AdSense**: `src/components/AdSlot.tsx`. No renderiza nada ni descarga el script
  mientras `VITE_ADSENSE_CLIENT` no esté configurada, así que el sitio funciona
  igual antes y después de la aprobación. Para activarlo:
  1. cargar `VITE_ADSENSE_CLIENT` y `VITE_ADSENSE_SLOT_FOOTER` en Vercel;
  2. subir `public/ads.txt` con la línea que entrega AdSense
     (`google.com, pub-XXXXXXXX, DIRECT, f08c47fec0942fa0`);
  3. re-deployar.

---

## Estructura

```
src/
  components/
    MainLayout.tsx      Shell: tabs de torneo, split fixture/tabla, share
    FixtureView.tsx     Partidos de la fecha y selector de marcador
    StandingsView.tsx   Tabla + columna de probabilidades
    ShareDialog.tsx     Imagen PNG, WhatsApp y link con pronósticos
    Seo.tsx             Metadatos por ruta en navegación de cliente
    AdSlot.tsx          Unidad AdSense (inerte sin env vars)
  hooks/
    useLiveLeagueEngine.ts  Fixtures + pronósticos + tablas por torneo
    useFixtures.ts          Fetch a Supabase con reintentos y polling
    useOdds.ts              Monte Carlo con debounce
  lib/
    predictions.ts      Codificación, localStorage y URL de pronósticos
    simulation.ts       Motor Monte Carlo
  data/
    seoRoutes.mjs       Copy SEO de cada ruta (app + pre-render)
    fixture.json        Fixture base del Apertura
    teams.ts            Los 18 equipos
scripts/
  prerender.mjs         HTML estático + sitemap por ruta
supabase/
  functions/            Edge Functions (fixtures, goleadores, H2H, livescore)
  migrations/
```

## Rutas

| Ruta | Contenido |
| --- | --- |
| `/` | Calculadora (Apertura / Clausura / Acumulada) |
| `/goleadores` | Tabla de goleadores |
| `/pizarra` | Pizarra táctica |
| `/equipos/:slug` | Ficha de cada uno de los 18 equipos |
| `/blog`, `/blog/:slug` | Artículos y predicciones |
| `/login`, `/registro`, `/admin` | Panel de administración (no indexado) |
