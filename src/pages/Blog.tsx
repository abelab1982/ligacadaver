import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { blogPostsMeta } from "@/data/blog";
import { Calendar, Tag, ArrowRight } from "lucide-react";
import { useEffect } from "react";

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

const Blog = () => {
  useEffect(() => {
    document.title = "Blog - Liga 1 Calc | Predicciones y Analisis del Futbol Peruano";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        "content",
        "Predicciones, resumenes y analisis de la Liga 1 del futbol peruano. Informacion actualizada fecha a fecha."
      );
    }
  }, []);

  return (
    <div className="h-full overflow-y-auto bg-background text-foreground">
      <Header />
      <main className="container max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Blog <span className="text-primary">Liga 1</span>
          </h1>
          <p className="text-muted-foreground">
            Predicciones, resumenes y analisis del futbol peruano
          </p>
        </div>

        {blogPostsMeta.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">
            Aun no hay articulos publicados. Vuelve pronto.
          </p>
        ) : (
          <div className="grid gap-6">
            {blogPostsMeta.map((post) => (
              <Link
                key={post.slug}
                to={`/blog/${post.slug}`}
                className="group block rounded-xl border border-border bg-card p-6 hover:border-primary/50 transition-all duration-200 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      categoryColors[post.category] || "bg-muted text-muted-foreground"
                    }`}
                  >
                    {categoryLabels[post.category] || post.category}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(post.date).toLocaleDateString("es-PE", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {post.tournament} {post.season} - Fecha {post.matchday}
                  </span>
                </div>

                <h2 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                  {post.title}
                </h2>

                <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                  {post.description}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    {post.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs text-muted-foreground flex items-center gap-1"
                      >
                        <Tag className="w-3 h-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span className="text-primary text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                    Leer mas <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Blog;
