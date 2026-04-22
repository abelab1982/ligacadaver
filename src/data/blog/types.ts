export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: "predicciones" | "resumen" | "analisis";
  matchday: number;
  tournament: "Apertura" | "Clausura";
  season: number;
  image?: string;
  tags: string[];
  status: "draft" | "published";
  content: string; // Markdown content
}

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: BlogPost["category"];
  matchday: number;
  tournament: string;
  season: number;
  image?: string;
  tags: string[];
}
