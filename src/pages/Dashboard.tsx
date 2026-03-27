import { BookOpen, Layers, FileText, Clock, Compass, MapPin, Anchor, Plus, Brain, TrendingUp, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useReveal } from "@/hooks/useReveal";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useEffect } from "react";

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
  const aiRef = useReveal();

  const [aiTip, setAiTip] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState(false);

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

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('subjects' as any).select('*').eq('user_id', user?.id || '');
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!user,
  });

  // Effect to fetch AI Tip
  useEffect(() => {
    if (!user) return;
    
    const fetchAiTip = async () => {
      setIsAiLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('chat', {
          body: {
            messages: [
              {
                role: 'user',
                content: `Com base em um estudante que tem ${flashcards.length} flashcards e ${generatedMaterials.length} materiais gerados, dê uma dica de estudo curta (máximo 2 frases) e motivadora para começar o dia. Comece com "Dica de hoje:".`
              }
            ]
          }
        });
        if (data?.result) {
            // The result might be streamed or just a string depending on how invoke works with stream: true
            // In this context, we assume a simple response for the dashboard
            setAiTip(data.result.split('\n')[0] || "Continue sua jornada de aprendizado hoje!");
        } else if (data?.choices?.[0]?.message?.content) {
            setAiTip(data.choices[0].message.content);
        } else {
            setAiTip("A consistência é a chave para o aprendizado a longo prazo. Vamos estudar?");
        }
      } catch (e) {
        setAiTip("Foco nos estudos! Cada minuto de revisão te deixa mais próximo do seu objetivo.");
      } finally {
        setIsAiLoading(false);
      }
    };

    if (flashcards.length > 0 || generatedMaterials.length > 0) {
      fetchAiTip();
    }
  }, [user, flashcards.length, generatedMaterials.length]);

  // Calculate distinct subjects from flashcards and actual subjects table
  const subjectMap = new Map<string, { count: number, color: string }>();
  
  // Fill from subjects table first
  subjects.forEach((s: any) => {
    subjectMap.set(s.name, { count: 0, color: s.color });
  });

  flashcards.forEach(card => {
    const subj = card.subject || "Geral";
    if (!subjectMap.has(subj)) {
        subjectMap.set(subj, { count: 0, color: "hsl(210, 75%, 35%)" });
    }
    subjectMap.get(subj)!.count += 1;
  });
  
  const subjectsCount = subjects.length || subjectMap.size;
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

  const recentSubjects = Array.from(subjectMap.entries()).map(([name, data]) => {
    const reviewed = flashcards.filter(c => c.subject === name && (c.repetitions || 0) > 0).length;
    const progress = data.count > 0 ? Math.round((reviewed / data.count) * 100) : 0;

    return { name, cards: data.count, color: data.color, progress };
  }).sort((a, b) => b.cards - a.cards).slice(0, 4);

  const activities = [
    ...generatedMaterials.slice(0, 5).map((m) => ({
       action: `Gerou ${m.type === 'summary' ? 'resumo' : m.type}: ${(m.title.split('-')[1]?.trim().slice(0, 20)) || 'Novo material'}`,
       subject: (m as any).subject || "Geral",
       time: formatDistanceToNow(new Date(m.created_at), { addSuffix: true, locale: ptBR }),
       date: new Date(m.created_at)
    })),
    ...reviewSessions.slice(0, 5).map(s => ({
       action: "Revisou flashcards",
       subject: s.subject || "Geral",
       time: formatDistanceToNow(new Date(s.started_at), { addSuffix: true, locale: ptBR }),
       date: new Date(s.started_at)
    }))
  ];
  
  activities.sort((a, b) => b.date.getTime() - a.date.getTime());
  const recentActivity = activities.slice(0, 5);

  const flashcardsToReview = flashcards.filter(card => !card.next_review || new Date(card.next_review) <= new Date()).length;

  return (
    <div className="space-y-6 sm:space-y-10 pb-10">
      {/* Header */}
      <div className="grid gap-6 lg:grid-cols-3 items-start">
        <div ref={heroRef} className="reveal lg:col-span-2">
          <div className="flex items-center gap-2 text-primary font-medium text-sm mb-2">
            <Sparkles className="h-4 w-4 animate-pulse-gentle" />
            <span className="tracking-wide uppercase text-[10px]">Portal do Estudante</span>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground text-balance">
            Bom dia, {user?.user_metadata?.display_name || "explorador"} 👋
          </h1>
          <p className="mt-2 text-muted-foreground max-w-xl">
            Sua jornada de hoje espera por você. Você tem <span className="font-semibold text-primary">{flashcardsToReview} flashcards</span> para revisar e novas matérias para conquistar.
          </p>
          
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/flashcards"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300 hover:bg-primary/90 hover:-translate-y-0.5 active:translate-y-0"
            >
              <Layers className="h-4 w-4" />
              Revisar Agora
            </Link>
            <Link
              to="/generate"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground shadow-sm transition-all duration-300 hover:bg-secondary hover:-translate-y-0.5 active:translate-y-0"
            >
              <Plus className="h-4 w-4" />
              Novo Material
            </Link>
          </div>
        </div>

        {/* AI Tip Widget */}
        <div ref={aiRef} className="reveal lg:col-span-1" style={{ transitionDelay: "50ms" }}>
          <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-5 shadow-sm">
            <div className="absolute top-0 right-0 -mr-4 -mt-4 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Brain className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-heading text-sm font-bold text-foreground uppercase tracking-wider">StudyAI recomenda</h3>
            </div>
            <div className="min-h-[60px]">
              {isAiLoading ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-3 w-full bg-primary/10 rounded" />
                  <div className="h-3 w-2/3 bg-primary/10 rounded" />
                </div>
              ) : (
                <p className="text-sm text-foreground/80 leading-relaxed italic">
                  "{aiTip || "A consistência é a chave! Que tal revisar alguns flashcards agora?"}"
                </p>
              )}
            </div>
            <Link 
              to="/chat" 
              className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-primary group"
            >
              Conversar com assistente
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div ref={statsRef} className="reveal grid grid-cols-2 gap-4 lg:grid-cols-4" style={{ transitionDelay: "150ms" }}>
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={`group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/20 ${borderStyles[stat.accent]}`}
          >
            <div className={`inline-flex rounded-xl p-2.5 ${accentStyles[stat.accent]}`}>
              <stat.icon className="h-5 w-5" strokeWidth={2} />
            </div>
            <p className="mt-4 font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{stat.value}</p>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wide">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Subjects */}
        <div ref={subjectsRef} className="reveal lg:col-span-2" style={{ transitionDelay: "250ms" }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              Destinos de Estudo
            </h2>
            <Link
              to="/subjects"
              className="text-xs font-bold uppercase tracking-widest text-primary/70 transition-colors hover:text-primary"
            >
              Ver todos
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {recentSubjects.length > 0 ? recentSubjects.map((subject: any) => (
              <div
                key={subject.name}
                className="group cursor-pointer rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/20 active:scale-[0.99]"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{subject.name}</h3>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5">{subject.cards} itens catalogados</p>
                  </div>
                  <div className="h-4 w-4 rounded-full border-2 border-background shadow-sm" style={{ backgroundColor: subject.color }} />
                </div>
                <div className="mt-5">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    <span>Domínio da Matéria</span>
                    <span className="text-foreground">{subject.progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-primary transition-all duration-700 ease-out shadow-[0_0_8px_rgba(var(--primary),0.3)]" 
                      style={{ width: `${subject.progress}%` }} 
                    />
                  </div>
                </div>
              </div>
            )) : (
              <div className="col-span-full rounded-2xl border border-dashed border-border bg-secondary/20 p-10 text-center">
                <Anchor className="mx-auto h-10 w-10 text-muted-foreground/20 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">O mapa está em branco.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Gere materiais para começar a mapear seus conhecimentos.</p>
                <Link to="/subjects?new=true" className="mt-4 inline-flex text-xs font-bold text-primary uppercase tracking-wider">Criar primeira matéria</Link>
              </div>
            )}
          </div>
        </div>

        {/* Activity */}
        <div ref={activityRef} className="reveal" style={{ transitionDelay: "350ms" }}>
          <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2 mb-5">
            <div className="h-1.5 w-1.5 rounded-full bg-gold" />
            Diário de Bordo
          </h2>
          <div className="space-y-3">
            {recentActivity.length > 0 ? recentActivity.map((item: any, i: number) => (
              <div key={i} className="group flex items-start gap-4 rounded-xl border border-transparent bg-card/50 p-3 transition-colors hover:border-border hover:bg-card">
                <div className="mt-1 flex-shrink-0">
                  <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight">{item.action}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1.5">
                    {item.subject} <span className="mx-1 text-border">•</span> {item.time}
                  </p>
                </div>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-border bg-secondary/20 p-8 text-center">
                <p className="text-xs font-medium text-muted-foreground">Nenhum registro hoje.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
