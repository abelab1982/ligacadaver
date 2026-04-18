// SEO-friendly slugs for team pages
export const teamSlugMap: Record<string, string> = {
  "universitario": "uni",
  "alianza-lima": "ali",
  "sporting-cristal": "cri",
  "melgar": "mel",
  "cusco-fc": "cus",
  "cienciano": "cie",
  "deportivo-garcilaso": "gar",
  "adt": "adt",
  "sport-huancayo": "shu",
  "utc": "utc",
  "comerciantes-unidos": "com",
  "fc-cajamarca": "fcc",
  "los-chankas": "cha",
  "atletico-grau": "gra",
  "alianza-atletico": "aas",
  "sport-boys": "sba",
  "juan-pablo-ii": "jpi",
  "deportivo-moquegua": "moq",
};

// Reverse map: team id -> slug
export const teamIdToSlug: Record<string, string> = Object.fromEntries(
  Object.entries(teamSlugMap).map(([slug, id]) => [id, slug])
);

export const getTeamIdFromSlug = (slug: string): string | null => {
  return teamSlugMap[slug] || null;
};

export const getSlugFromTeamId = (teamId: string): string | null => {
  return teamIdToSlug[teamId] || null;
};
