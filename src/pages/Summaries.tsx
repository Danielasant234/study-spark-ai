import { FileText, Download, Clock, Eye } from "lucide-react";
import { useReveal } from "@/hooks/useReveal";

const summaries = [
  { title: "Princípios Fundamentais da CF/88", subject: "Direito Constitucional", date: "Há 2 dias", pages: 3 },
  { title: "Estrutura do DNA e RNA", subject: "Biologia Molecular", date: "Há 5 dias", pages: 5 },
  { title: "Limites e Derivadas", subject: "Cálculo II", date: "Há 1 semana", pages: 4 },
  { title: "Era Vargas (1930-1945)", subject: "História do Brasil", date: "Há 1 semana", pages: 6 },
  { title: "Mecânica Quântica Introdução", subject: "Física Quântica", date: "Há 2 semanas", pages: 8 },
];

export default function Summaries() {
  const headerRef = useReveal();
  const listRef = useReveal();

  return (
    <div className="space-y-6">
      <div ref={headerRef} className="reveal">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Resumos</h1>
        <p className="text-sm text-muted-foreground">Resumos gerados automaticamente pela IA</p>
      </div>

      <div ref={listRef} className="reveal space-y-3" style={{ transitionDelay: "100ms" }}>
        {summaries.map((summary, i) => (
          <div
            key={i}
            className="group flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-300 hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{summary.title}</h3>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{summary.subject}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {summary.date}
                  </span>
                  <span>·</span>
                  <span>{summary.pages} páginas</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
              <button className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                <Eye className="h-4 w-4" />
              </button>
              <button className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
