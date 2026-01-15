export interface Team {
  id: string;
  name: string;
  abbreviation: string;
  city: string;
  stadium: string;
  primaryColor: string;
  altitude: number;
  status: string;
  apiTeamId: number; // API-Football team ID
  // Stats
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
}

export const initialTeams: Team[] = [
  {
    id: "uni",
    name: "Universitario",
    abbreviation: "UNI",
    city: "Lima",
    stadium: "Monumental",
    primaryColor: "#FFFDD0",
    altitude: 250,
    status: "Campeón 2025",
    apiTeamId: 2540,
    played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0
  },
  {
    id: "ali",
    name: "Alianza Lima",
    abbreviation: "ALI",
    city: "Lima",
    stadium: "A. Villanueva",
    primaryColor: "#192745",
    altitude: 150,
    status: "",
    apiTeamId: 2553,
    played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0
  },
  {
    id: "cri",
    name: "Sporting Cristal",
    abbreviation: "CRI",
    city: "Lima",
    stadium: "A. Gallardo",
    primaryColor: "#5CBFEB",
    altitude: 150,
    status: "",
    apiTeamId: 2546,
    played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0
  },
  {
    id: "mel",
    name: "FBC Melgar",
    abbreviation: "MEL",
    city: "Arequipa",
    stadium: "UNSA",
    primaryColor: "#D71920",
    altitude: 2335,
    status: "Altura",
    apiTeamId: 2554,
    played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0
  },
  {
    id: "cus",
    name: "Cusco FC",
    abbreviation: "CUS",
    city: "Cusco",
    stadium: "Garcilaso",
    primaryColor: "#D4AF37",
    altitude: 3399,
    status: "Altura Extrema",
    apiTeamId: 10013,
    played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0
  },
  {
    id: "cie",
    name: "Cienciano",
    abbreviation: "CIE",
    city: "Cusco",
    stadium: "Garcilaso",
    primaryColor: "#CC0000",
    altitude: 3399,
    status: "Altura Extrema",
    apiTeamId: 2562,
    played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0
  },
  {
    id: "gar",
    name: "Dep. Garcilaso",
    abbreviation: "GAR",
    city: "Cusco",
    stadium: "Garcilaso",
    primaryColor: "#87CEEB",
    altitude: 3399,
    status: "Altura Extrema",
    apiTeamId: 20960,
    played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0
  },
  {
    id: "adt",
    name: "ADT",
    abbreviation: "ADT",
    city: "Tarma",
    stadium: "Unión Tarma",
    primaryColor: "#87CEEB",
    altitude: 3053,
    status: "Altura",
    apiTeamId: 10492,
    played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0
  },
  {
    id: "shu",
    name: "Sport Huancayo",
    abbreviation: "SHU",
    city: "Huancayo",
    stadium: "IPD Huancayo",
    primaryColor: "#CC0000",
    altitude: 3259,
    status: "Altura Extrema",
    apiTeamId: 2555,
    played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0
  },
  {
    id: "utc",
    name: "UTC",
    abbreviation: "UTC",
    city: "Cajamarca",
    stadium: "Héroes San Ramón",
    primaryColor: "#FFFDD0",
    altitude: 2750,
    status: "Altura",
    apiTeamId: 2539,
    played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0
  },
  {
    id: "com",
    name: "Comerciantes U.",
    abbreviation: "COM",
    city: "Cutervo",
    stadium: "Juan Maldonado",
    primaryColor: "#663399",
    altitude: 2637,
    status: "Altura",
    apiTeamId: 2558,
    played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0
  },
  {
    id: "fcc",
    name: "FC Cajamarca",
    abbreviation: "FCC",
    city: "Cajamarca",
    stadium: "Héroes San Ramón",
    primaryColor: "#FFA500",
    altitude: 2750,
    status: "Ascendido",
    apiTeamId: 22543,
    played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0
  },
  {
    id: "cha",
    name: "Los Chankas",
    abbreviation: "CHA",
    city: "Andahuaylas",
    stadium: "Los Chankas",
    primaryColor: "#800000",
    altitude: 2926,
    status: "Altura",
    apiTeamId: 2572,
    played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0
  },
  {
    id: "gra",
    name: "Atlético Grau",
    abbreviation: "GRA",
    city: "Piura",
    stadium: "Campeones del 36",
    primaryColor: "#FFFF00",
    altitude: 60,
    status: "Calor Extremo",
    apiTeamId: 2564,
    played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0
  },
  {
    id: "aas",
    name: "Alianza Atlético",
    abbreviation: "AAS",
    city: "Sullana",
    stadium: "Campeones del 36",
    primaryColor: "#FFFFFF",
    altitude: 60,
    status: "Calor Extremo",
    apiTeamId: 2560,
    played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0
  },
  {
    id: "sba",
    name: "Sport Boys",
    abbreviation: "SBA",
    city: "Callao",
    stadium: "Miguel Grau",
    primaryColor: "#FF69B4",
    altitude: 5,
    status: "",
    apiTeamId: 2544,
    played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0
  },
  {
    id: "jpi",
    name: "Juan Pablo II",
    abbreviation: "JPI",
    city: "Chongoyape",
    stadium: "Municipal",
    primaryColor: "#FFFF00",
    altitude: 200,
    status: "",
    apiTeamId: 22479,
    played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0
  },
  {
    id: "moq",
    name: "Dep. Moquegua",
    abbreviation: "MOQ",
    city: "Moquegua",
    stadium: "25 de Noviembre",
    primaryColor: "#008000",
    altitude: 1410,
    status: "Ascendido",
    apiTeamId: 22489,
    played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0
  }
];

export const calculatePoints = (team: Team): number => {
  return team.won * 3 + team.drawn;
};

export const calculateGoalDifference = (team: Team): number => {
  return team.goalsFor - team.goalsAgainst;
};

export const getStatusBadge = (status: string): { class: string; label: string } | null => {
  if (status === "Campeón 2025") return { class: "badge-champion", label: "🏆 Campeón" };
  if (status.includes("Altura Extrema")) return { class: "badge-altitude", label: "⛰️ +3000m" };
  if (status === "Altura") return { class: "badge-altitude", label: "🏔️ Altura" };
  if (status.includes("Calor")) return { class: "badge-heat", label: "🔥 Calor" };
  if (status.includes("Ascendido")) return { class: "badge-promoted", label: "⬆️ Ascendido" };
  return null;
};
