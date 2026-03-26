import { BookOpen, Layers, FileText, Clock, Compass, MapPin, Anchor, Plus, Brain, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useReveal } from "@/hooks/useReveal";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

export default function Dashboard() {
  const { user } = useAuth();
  const heroRef = useReveal();
  const statsRef = useReveal();
  const subjectsRef = useReveal();
  const activityRef = useReveal();

  const { data: flashcards = [] } = useQuery({
    queryKey: ['flashcards', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('flashcards').select('*').eq('user_id', user?.id || '');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: generatedMaterials = [] } = useQuery({
    queryKey: ['generated_materials', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('generated_materials').select('*').eq('user_id', user?.id || '').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: reviewSessions = [] } = useQuery({
    queryKey: ['review_sessions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('review_sessions').select('*').eq('user_id', user?.id || '').order('started_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Calculate distinct subjects from flashcards
  const subjectMap = new Map<string, typeof flashcards>();
  flashcards.forEach(card => {
    const subj = card.subject || "Geral";
    if (!subjectMap.has(subj)) subjectMap.set(subj, []);
    subjectMap.get(subj)!.push(card);
  });
  
  const subjectsCount = subjectMap.size;
  const summariesCount = generatedMaterials.filter((m) => m.type === 'summary').length;

  const totalMs = reviewSessions.reduce((acc, session) => acc + (session.total_time_ms || 0), 0);
  const hours = Math.floor(totalMs / (1000 * 60 * 60));
  const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
  const hoursStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  const stats = [
    { label: "Matérias", value: subjectsCount.toString(), icon: BookOpen, accent: "ocean" as const },
    { label: "Flashcards", value: flashcards.length.toString(), icon: Layers, accent: "gold" as const },
    { label: "Resumos", value: summariesCount.toString(), icon: FileText, accent: "crimson" as const },
    { label: "Tempo Estudado", value: hoursStr, icon: Clock, accent: "ocean" as const },
  ];

  const recentSubjects = Array.from(subjectMap.entries()).map(([name, cards]) => {
    const colors = ["#b91c1c", "#c2410c", "#b45309", "#4d7c0f", "#0f766e", "#0369a1", "#4338ca", "#a21caf"];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const color = colors[hash % colors.length];
    
    const reviewed = cards.filter(c => (c.repetitions || 0) > 0).length;
    const progress = cards.length > 0 ? Math.round((reviewed / cards.length) * 100) : 0;

    return { name, cards: cards.length, color, progress };
  }).slice(0, 4);

  const activities = [
    ...generatedMaterials.slice(0, 10).map(m => ({
       action: `Gerou material: ${m.title.split('-')[0]?.trim() || 'Resumo'}`,
       subject: "IA",
       time: new Date(m.created_at).toLocaleDateString(),
       date: new Date(m.created_at)
    })),
    ...reviewSessions.slice(0, 10).map(s => ({
       action: "Revisou flashcards",
       subject: s.subject || "Geral",
       time: new Date(s.started_at).toLocaleDateString(),
       date: new Date(s.started_at)
    }))
  ];
  
  activities.sort((a, b) => b.date.getTime() - a.date.getTime());
  const recentActivity = activities.slice(0, 6);

  const flashcardsToReview = flashcards.filter(card => !card.next_review || new Date(card.next_review) <= new Date()).length;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div ref={heroRef} className="reveal">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
          <Compass className="h-4 w-4" strokeWidth={1.75} />
          <span>Sua rota de estudos</span>
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground text-balance">
          Bom dia, {user?.user_metadata?.display_name || "explorador"} 🧭
        </h1>
        <p className="mt-1 text-sm sm:text-base text-muted-foreground">
          Você tem <span className="font-semibold text-primary">{flashcardsToReview} flashcards</span> para revisar hoje.
        </p>
      </div>

      {/* Stats */}
      <div ref={statsRef} className="reveal grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" style={{ transitionDelay: "80ms" }}>
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`group rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm transition-shadow duration-300 hover:shadow-md ${borderStyles[stat.accent]}`}
          >
            <div className={`inline-flex rounded-lg p-2 ${accentStyles[stat.accent]}`}>
              <stat.icon className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <p className="mt-2 sm:mt-3 font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground">{stat.value}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Subjects */}
        <div ref={subjectsRef} className="reveal lg:col-span-2" style={{ transitionDelay: "160ms" }}>
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
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
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: subject.color }} />
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Progresso de Revisão</span>
                    <span className="font-medium text-foreground">{subject.progress}%</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-border">
                    <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${subject.progress}%` }} />
                  </div>
                </div>
              </div>
            )) : (
              <div className="col-span-full rounded-xl border border-dashed border-border bg-secondary/50 p-6 sm:p-8 text-center">
                <Anchor className="mx-auto h-8 w-8 text-muted-foreground/40" strokeWidth={1.5} />
                <p className="mt-2 text-sm text-muted-foreground">Nenhum destino definido ainda.</p>
                <p className="text-xs text-muted-foreground/70">Gere resumos ou flashcards para iniciar sua jornada!</p>
              </div>
            )}
          </div>
        </div>

        {/* Activity */}
        <div ref={activityRef} className="reveal" style={{ transitionDelay: "240ms" }}>
          <h2 className="font-heading text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-gold" strokeWidth={1.75} />
            Diário de Bordo
          </h2>
          <div className="mt-4 space-y-3">
            {recentActivity.length > 0 ? recentActivity.map((item: any, i: number) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
                <div className="mt-0.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.action}</p>
                  <p className="text-xs text-muted-foreground">{item.subject} · {item.time}</p>
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
      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        <Link
          to="/flashcards"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 sm:py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 active:scale-[0.97]"
        >
          <Layers className="h-4 w-4" strokeWidth={1.75} />
          Revisar Flashcards
        </Link>
        <Link
          to="/chat"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-3 sm:py-2.5 text-sm font-medium text-foreground shadow-sm transition-all duration-200 hover:bg-secondary active:scale-[0.97]"
        >
          <Brain className="h-4 w-4" strokeWidth={1.75} />
          Perguntar à IA
        </Link>
        <Link
          to="/generate"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-transparent px-4 py-3 sm:py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:border-primary hover:text-primary active:scale-[0.97]"
        >
          <Plus className="h-4 w-4" strokeWidth={1.75} />
          Gerar Novo Material
        </Link>
      </div>
    </div>
  );
}
