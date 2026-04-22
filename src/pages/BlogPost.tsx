import { useParams, Link, Navigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { getBlogPost } from "@/data/blog";
import { Calendar, Tag, ArrowLeft, ChevronRight } from "lucide-react";
import { useEffect } from "react";

/** Simple markdown-to-HTML converter (no external dependency) */
function renderMarkdown(md: string): string {
  let html = md
    // Headings
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-8 mb-3 text-foreground">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-10 mb-4 text-foreground">$1</h2>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr class="my-8 border-border" />')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Links
    .replace(
      /\[(.+?)\]\((.+?)\)/g,
      '<a href="$2" class="text-primary hover:underline">$1</a>'
    )
    // Paragraphs: wrap lines that aren't already HTML tags
    .split("\n\n")
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith("<")) return trimmed;
      return `<p class="text-muted-foreground leading-relaxed mb-4">${trimmed.replace(
        /\n/g,
        "<br />"
      )}</p>`;
    })
    .join("\n");

  return html;
}

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getBlogPost(slug) : undefined;

  useEffect(() => {
    if (post) {
      document.title = `${post.title} | Liga 1 Calc`;
      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute("content", post.description);

      // Update OG tags
      const setMeta = (property: string, content: string) => {
        let el = document.querySelector(`meta[property="${property}"]`);
        if (!el) {
          el = document.createElement("meta");
          el.setAttribute("property", property);
          document.head.appendChild(el);
        }
        el.setAttribute("content", content);
      };
      setMeta("og:title", post.title);
      setMeta("og:description", post.description);
      setMeta("og:url", `https://www.liga1calc.pe/blog/${post.slug}`);
      setMeta("og:type", "article");
    }
  }, [post]);

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  const formattedDate = new Date(post.date).toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const categoryLabels: Record<string, string> = {
    predicciones: "Predicciones",
    resumen: "Resumen",
    analisis: "Analisis",
  };

  const categoryColors: Record<string, string> = {
    predicciones: "bg-blue-500/20 text-blue-400",
    resumen: "bg-green-500/20 text-green-400",
    analisis: "bg-purple-500/20 text-purple-400",
  };

  return (
    <div className="h-full overflow-y-auto bg-background text-foreground">
      <Header />
      <main className="container max-w-3xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary transition-colors">
            Inicio
          </Link>
          <ChevronRight className="w-3 h-3" />
          <Link to="/blog" className="hover:text-primary transition-colors">
            Blog
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground truncate">{post.title}</span>
        </nav>

        {/* Article header */}
        <article>
          <header className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  categoryColors[post.category] || "bg-muted text-muted-foreground"
                }`}
              >
                {categoryLabels[post.category] || post.category}
              </span>
              <span className="text-xs text-muted-foreground">
                {post.tournament} {post.season} - Fecha {post.matchday}
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
              {post.title}
            </h1>

            <p className="text-lg text-muted-foreground mb-4">{post.description}</p>

            <div className="flex items-center gap-4 text-sm text-muted-foreground border-b border-border pb-6">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {formattedDate}
              </span>
              <div className="flex items-center gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </header>

          {/* Article content */}
          <div
            className="prose-custom"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
          />
        </article>

        {/* Back link */}
        <div className="mt-12 pt-6 border-t border-border">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al blog
          </Link>
        </div>

        {/* JSON-LD structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BlogPosting",
              headline: post.title,
              description: post.description,
              datePublished: post.date,
              url: `https://www.liga1calc.pe/blog/${post.slug}`,
              publisher: {
                "@type": "Organization",
                name: "Liga 1 Calc",
                url: "https://www.liga1calc.pe",
              },
              mainEntityOfPage: {
                "@type": "WebPage",
                "@id": `https://www.liga1calc.pe/blog/${post.slug}`,
              },
            }),
          }}
        />
      </main>
    </div>
  );
};

export default BlogPost;
