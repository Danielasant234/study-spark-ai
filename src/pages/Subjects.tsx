import { BookOpen, Plus, MoreVertical } from "lucide-react";
import { useReveal } from "@/hooks/useReveal";

const subjects = [
  { name: "Direito Constitucional", cards: 38, summaries: 5, progress: 72, color: "hsl(158, 64%, 32%)" },
  { name: "Biologia Molecular", cards: 25, summaries: 3, progress: 45, color: "hsl(38, 92%, 55%)" },
  { name: "Cálculo II", cards: 31, summaries: 4, progress: 60, color: "hsl(210, 80%, 55%)" },
  { name: "História do Brasil", cards: 48, summaries: 7, progress: 88, color: "hsl(340, 65%, 50%)" },
  { name: "Física Quântica", cards: 18, summaries: 2, progress: 30, color: "hsl(270, 60%, 55%)" },
  { name: "Português", cards: 22, summaries: 4, progress: 55, color: "hsl(15, 75%, 50%)" },
];

export default function Subjects() {
  const headerRef = useReveal();
  const gridRef = useReveal();

  return (
    <div className="space-y-6">
      <div ref={headerRef} className="reveal flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Matérias</h1>
          <p className="text-sm text-muted-foreground">Organize seus estudos por área de conhecimento</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 active:scale-[0.97]">
          <Plus className="h-4 w-4" />
          Nova Matéria
        </button>
      </div>

      <div ref={gridRef} className="reveal grid gap-4 sm:grid-cols-2 lg:grid-cols-3" style={{ transitionDelay: "100ms" }}>
        {subjects.map((subject) => (
          <div
            key={subject.name}
            className="group cursor-pointer rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:shadow-md active:scale-[0.98]"
          >
            <div className="flex items-start justify-between">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${subject.color}15` }}
              >
                <BookOpen className="h-5 w-5" style={{ color: subject.color }} />
              </div>
              <button className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-secondary">
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
            <h3 className="mt-3 font-semibold text-foreground">{subject.name}</h3>
            <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
              <span>{subject.cards} flashcards</span>
              <span>{subject.summaries} resumos</span>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Progresso</span>
                <span className="font-semibold text-foreground">{subject.progress}%</span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-border">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${subject.progress}%`, backgroundColor: subject.color }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
