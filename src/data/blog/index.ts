import { BlogPost, BlogPostMeta } from "./types";
import { post as prediccionesFecha11 } from "./predicciones-fecha-11-apertura-2026";

// Register all blog posts here
const allPosts: BlogPost[] = [
  prediccionesFecha11,
];

// Only published posts, sorted by date descending
export const blogPosts: BlogPost[] = allPosts
  .filter((p) => p.status === "published")
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

// Lightweight metadata for list pages (no content)
export const blogPostsMeta: BlogPostMeta[] = blogPosts.map(
  ({ content, status, ...meta }) => meta
);

// Find a single post by slug
export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

export type { BlogPost, BlogPostMeta };
