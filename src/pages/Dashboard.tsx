import { BookOpen, Brain, FileText, Layers, Clock, TrendingUp, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useReveal } from "@/hooks/useReveal";

const stats = [
  { label: "Matérias", value: "6", icon: BookOpen, color: "bg-primary/10 text-primary" },
  { label: "Flashcards", value: "142", icon: Layers, color: "bg-accent/15 text-accent-foreground" },
  { label: "Resumos", value: "23", icon: FileText, color: "bg-info/10 text-info" },
  { label: "Horas estudadas", value: "47.5h", icon: Clock, color: "bg-success/10 text-success" },
];

const recentSubjects = [
  { name: "Direito Constitucional", cards: 38, progress: 72, color: "hsl(158, 64%, 32%)" },
  { name: "Biologia Molecular", cards: 25, progress: 45, color: "hsl(38, 92%, 55%)" },
  { name: "Cálculo II", cards: 31, progress: 60, color: "hsl(210, 80%, 55%)" },
  { name: "História do Brasil", cards: 48, progress: 88, color: "hsl(340, 65%, 50%)" },
];

const recentActivity = [
  { action: "Estudou 15 flashcards", subject: "Direito Constitucional", time: "Há 2 horas" },
  { action: "Gerou resumo", subject: "Biologia Molecular", time: "Há 5 horas" },
  { action: "Completou exercícios", subject: "Cálculo II", time: "Ontem" },
  { action: "Adicionou 8 flashcards", subject: "História do Brasil", time: "Ontem" },
];

export default function Dashboard() {
  const heroRef = useReveal();
  const statsRef = useReveal();
  const subjectsRef = useReveal();
  const activityRef = useReveal();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div ref={heroRef} className="reveal">
        <h1 className="text-3xl font-bold tracking-tight text-foreground text-balance">
          Bom dia, estudante 👋
        </h1>
        <p className="mt-1 text-muted-foreground">
          Você tem <span className="font-semibold text-primary">12 flashcards</span> para revisar hoje.
        </p>
      </div>

      {/* Stats */}
      <div ref={statsRef} className="reveal grid grid-cols-2 gap-4 lg:grid-cols-4" style={{ transitionDelay: "80ms" }}>
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow duration-300 hover:shadow-md"
          >
            <div className={`inline-flex rounded-lg p-2 ${stat.color}`}>
              <stat.icon className="h-4 w-4" />
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Subjects */}
        <div ref={subjectsRef} className="reveal lg:col-span-2" style={{ transitionDelay: "160ms" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Matérias Recentes</h2>
            <Link
              to="/subjects"
              className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
            >
              Ver todas
            </Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {recentSubjects.map((subject) => (
              <div
                key={subject.name}
                className="group cursor-pointer rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-300 hover:shadow-md active:scale-[0.98]"
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
                    <span>Progresso</span>
                    <span className="font-medium text-foreground">{subject.progress}%</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-border">
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

        {/* Activity */}
        <div ref={activityRef} className="reveal" style={{ transitionDelay: "240ms" }}>
          <h2 className="text-lg font-semibold text-foreground">Atividade Recente</h2>
          <div className="mt-4 space-y-3">
            {recentActivity.map((item, i) => (
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
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          to="/flashcards"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 active:scale-[0.97]"
        >
          <Layers className="h-4 w-4" />
          Revisar Flashcards
        </Link>
        <Link
          to="/chat"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-all duration-200 hover:bg-secondary active:scale-[0.97]"
        >
          <Brain className="h-4 w-4" />
          Perguntar à IA
        </Link>
        <button className="inline-flex items-center gap-2 rounded-lg border border-dashed border-border bg-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:border-primary hover:text-primary active:scale-[0.97]">
          <Plus className="h-4 w-4" />
          Nova Matéria
        </button>
      </div>
    </div>
  );
}
