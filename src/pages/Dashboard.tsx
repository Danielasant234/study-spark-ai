import { BookOpen, Layers, FileText, Clock, Compass, MapPin, Anchor, Plus, Brain, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useReveal } from "@/hooks/useReveal";

const stats = [
  { label: "Matérias", value: "0", icon: BookOpen, accent: "ocean" as const },
  { label: "Flashcards", value: "0", icon: Layers, accent: "gold" as const },
  { label: "Resumos", value: "0", icon: FileText, accent: "crimson" as const },
  { label: "Horas estudadas", value: "0h", icon: Clock, accent: "ocean" as const },
];

const accentStyles = {
  ocean: "bg-ocean-light text-primary",
  crimson: "bg-crimson-light text-crimson",
  gold: "bg-gold-light text-gold",
};

const borderStyles = {
  ocean: "card-accent-ocean",
  crimson: "card-accent-crimson",
  gold: "card-accent-gold",
};

const recentSubjects: any[] = [];
const recentActivity: any[] = [];

export default function Dashboard() {
  const heroRef = useReveal();
  const statsRef = useReveal();
  const subjectsRef = useReveal();
  const activityRef = useReveal();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div ref={heroRef} className="reveal">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
          <Compass className="h-4 w-4" strokeWidth={1.75} />
          <span>Sua rota de estudos</span>
        </div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground text-balance">
          Bom dia, explorador 🧭
        </h1>
        <p className="mt-1 text-muted-foreground">
          Você tem <span className="font-semibold text-primary">0 flashcards</span> para revisar hoje.
        </p>
      </div>

      {/* Stats */}
      <div ref={statsRef} className="reveal grid grid-cols-2 gap-4 lg:grid-cols-4" style={{ transitionDelay: "80ms" }}>
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`group rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow duration-300 hover:shadow-md ${borderStyles[stat.accent]}`}
          >
            <div className={`inline-flex rounded-lg p-2 ${accentStyles[stat.accent]}`}>
              <stat.icon className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <p className="mt-3 font-heading text-2xl font-bold tracking-tight text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Subjects */}
        <div ref={subjectsRef} className="reveal lg:col-span-2" style={{ transitionDelay: "160ms" }}>
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" strokeWidth={1.75} />
              Destinos Recentes
            </h2>
            <Link
              to="/subjects"
              className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
            >
              Ver todos
            </Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {recentSubjects.length > 0 ? recentSubjects.map((subject: any) => (
              <div
                key={subject.name}
                className="group cursor-pointer rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-300 hover:shadow-md active:scale-[0.98] card-accent-ocean"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{subject.name}</h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">{subject.cards} flashcards</p>
                  </div>
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: subject.color }}
                  />
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Progresso na rota</span>
                    <span className="font-medium text-foreground">{subject.progress}%</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-border">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${subject.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            )) : (
              <div className="col-span-2 rounded-xl border border-dashed border-border bg-secondary/50 p-8 text-center">
                <Anchor className="mx-auto h-8 w-8 text-muted-foreground/40" strokeWidth={1.5} />
                <p className="mt-2 text-sm text-muted-foreground">Nenhum destino definido ainda.</p>
                <p className="text-xs text-muted-foreground/70">Crie sua primeira matéria para zarpar!</p>
              </div>
            )}
          </div>
        </div>

        {/* Activity */}
        <div ref={activityRef} className="reveal" style={{ transitionDelay: "240ms" }}>
          <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-gold" strokeWidth={1.75} />
            Diário de Bordo
          </h2>
          <div className="mt-4 space-y-3">
            {recentActivity.length > 0 ? recentActivity.map((item: any, i: number) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 shadow-sm"
              >
                <div className="mt-0.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.subject} · {item.time}
                  </p>
                </div>
              </div>
            )) : (
              <div className="rounded-xl border border-dashed border-border bg-secondary/50 p-6 text-center">
                <p className="text-sm text-muted-foreground">Nenhum registro no diário.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          to="/flashcards"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 active:scale-[0.97]"
        >
          <Layers className="h-4 w-4" strokeWidth={1.75} />
          Revisar Flashcards
        </Link>
        <Link
          to="/chat"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-all duration-200 hover:bg-secondary active:scale-[0.97]"
        >
          <Brain className="h-4 w-4" strokeWidth={1.75} />
          Perguntar à IA
        </Link>
        <Link
          to="/subjects" state={{ openNewSubject: true }}
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-border bg-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:border-primary hover:text-primary active:scale-[0.97]"
        >
          <Plus className="h-4 w-4" strokeWidth={1.75} />
          Novo Destino
        </Link>
      </div>
    </div>
  );
}
