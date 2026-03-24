import { useState, useEffect, useCallback, useRef } from "react";
import {
  RotateCcw, ChevronLeft, ChevronRight, Check, X, Shuffle, Play,
  BarChart3, Brain, Zap, Target, Clock, Filter, Layers, ArrowLeft,
  Trophy, Flame, TrendingUp,
} from "lucide-react";
import { useReveal } from "@/hooks/useReveal";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { calculateSM2, isDueForReview, getMasteryLevel, MASTERY_COLORS, MASTERY_LABELS } from "@/lib/sm2";
import { toast } from "@/hooks/use-toast";

interface Flashcard {
  id: string;
  front: string;
  back: string;
  subject: string;
  theme: string | null;
  difficulty: number;
  ease_factor: number;
  interval: number;
  repetitions: number;
  next_review: string;
  last_reviewed: string | null;
  times_correct: number;
  times_incorrect: number;
  total_time_ms: number;
  source_material_id: string | null;
  created_at: string;
}

type StudyMode = 'all' | 'due' | 'wrong' | 'hard' | 'quick' | 'marathon';

const STUDY_MODES = [
  { id: 'due' as StudyMode, label: 'Revisão Espaçada', icon: Brain, desc: 'Cards pendentes pelo SM-2', color: 'text-primary' },
  { id: 'all' as StudyMode, label: 'Revisão Completa', icon: Layers, desc: 'Todos os cards', color: 'text-foreground' },
  { id: 'wrong' as StudyMode, label: 'Apenas Errados', icon: X, desc: 'Foco em dificuldades', color: 'text-destructive' },
  { id: 'hard' as StudyMode, label: 'Mais Difíceis', icon: Flame, desc: 'Menor ease factor', color: 'text-accent-foreground' },
  { id: 'quick' as StudyMode, label: 'Revisão Rápida', icon: Zap, desc: '10 cards aleatórios', color: 'text-primary' },
  { id: 'marathon' as StudyMode, label: 'Maratona', icon: Target, desc: 'Todos, sem parar', color: 'text-destructive' },
];

type View = 'menu' | 'study' | 'stats';

export default function Flashcards() {
  const [allCards, setAllCards] = useState<Flashcard[]>([]);
  const [studyDeck, setStudyDeck] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [view, setView] = useState<View>('menu');
  const [mode, setMode] = useState<StudyMode>('due');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionIncorrect, setSessionIncorrect] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState(0);
  const [cardStartTime, setCardStartTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sessionComplete, setSessionComplete] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Load flashcards
  const loadCards = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('flashcards')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Erro ao carregar flashcards', description: error.message, variant: 'destructive' });
    } else {
      setAllCards((data as Flashcard[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadCards(); }, [loadCards]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('flashcards-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'flashcards' }, () => {
        loadCards();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadCards]);

  const subjects = Array.from(new Set(allCards.map(c => c.subject)));
  const filteredCards = subjectFilter === 'all' ? allCards : allCards.filter(c => c.subject === subjectFilter);

  const dueCards = filteredCards.filter(c => isDueForReview(c.next_review));
  const wrongCards = filteredCards.filter(c => c.times_incorrect > 0).sort((a, b) => {
    const aRatio = a.times_incorrect / Math.max(1, a.times_correct + a.times_incorrect);
    const bRatio = b.times_incorrect / Math.max(1, b.times_correct + b.times_incorrect);
    return bRatio - aRatio;
  });
  const hardCards = [...filteredCards].sort((a, b) => a.ease_factor - b.ease_factor).slice(0, Math.max(10, Math.ceil(filteredCards.length * 0.3)));

  const startStudy = (selectedMode: StudyMode) => {
    let deck: Flashcard[] = [];
    switch (selectedMode) {
      case 'due': deck = dueCards; break;
      case 'all': deck = [...filteredCards]; break;
      case 'wrong': deck = wrongCards; break;
      case 'hard': deck = hardCards; break;
      case 'quick': {
        const shuffled = [...filteredCards].sort(() => Math.random() - 0.5);
        deck = shuffled.slice(0, 10);
        break;
      }
      case 'marathon': deck = [...filteredCards].sort(() => Math.random() - 0.5); break;
    }

    if (deck.length === 0) {
      toast({ title: 'Sem cards', description: 'Não há flashcards para este modo.', variant: 'destructive' });
      return;
    }

    setMode(selectedMode);
    setStudyDeck(deck);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionCorrect(0);
    setSessionIncorrect(0);
    setSessionComplete(false);
    setSessionStartTime(Date.now());
    setCardStartTime(Date.now());
    setView('study');
  };

  const card = studyDeck[currentIndex];
  const total = studyDeck.length;

  const flip = () => setIsFlipped(!isFlipped);

  const answerCard = async (quality: number) => {
    if (!card) return;
    const timeSpent = Date.now() - cardStartTime;
    const isCorrect = quality >= 3;
    const sm2 = calculateSM2(card, quality);

    // Update in DB
    await supabase.from('flashcards').update({
      ease_factor: sm2.ease_factor,
      interval: sm2.interval,
      repetitions: sm2.repetitions,
      next_review: sm2.next_review,
      last_reviewed: new Date().toISOString(),
      times_correct: card.times_correct + (isCorrect ? 1 : 0),
      times_incorrect: card.times_incorrect + (isCorrect ? 0 : 1),
      total_time_ms: card.total_time_ms + timeSpent,
      difficulty: Math.max(0, Math.min(5, isCorrect ? card.difficulty : Math.min(5, card.difficulty + 1))),
    }).eq('id', card.id);

    if (isCorrect) setSessionCorrect(p => p + 1);
    else setSessionIncorrect(p => p + 1);

    // Next card
    setIsFlipped(false);
    if (currentIndex + 1 >= total) {
      // Session complete
      const elapsed = Date.now() - sessionStartTime;
      await supabase.from('review_sessions').insert({
        mode,
        subject: subjectFilter === 'all' ? null : subjectFilter,
        total_cards: total,
        correct: sessionCorrect + (isCorrect ? 1 : 0),
        incorrect: sessionIncorrect + (isCorrect ? 0 : 1),
        total_time_ms: elapsed,
        ended_at: new Date().toISOString(),
      });
      setSessionComplete(true);
    } else {
      setTimeout(() => {
        setCurrentIndex(i => i + 1);
        setCardStartTime(Date.now());
      }, 200);
    }
  };

  const navigate = (dir: 1 | -1) => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex(i => (i + dir + total) % total);
      setCardStartTime(Date.now());
    }, 200);
  };

  // --- Stats calculations ---
  const totalReviewed = allCards.reduce((s, c) => s + c.times_correct + c.times_incorrect, 0);
  const totalCorrect = allCards.reduce((s, c) => s + c.times_correct, 0);
  const overallAccuracy = totalReviewed > 0 ? Math.round((totalCorrect / totalReviewed) * 100) : 0;
  const masteryDistribution = allCards.reduce(
    (acc, c) => { acc[getMasteryLevel(c)]++; return acc; },
    { new: 0, learning: 0, reviewing: 0, mastered: 0 }
  );
  const subjectStats = subjects.map(s => {
    const cards = allCards.filter(c => c.subject === s);
    const total = cards.reduce((sum, c) => sum + c.times_correct + c.times_incorrect, 0);
    const correct = cards.reduce((sum, c) => sum + c.times_correct, 0);
    return { subject: s, cards: cards.length, accuracy: total > 0 ? Math.round((correct / total) * 100) : 0, due: cards.filter(c => isDueForReview(c.next_review)).length };
  });

  // --- RENDER ---
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Stats view
  if (view === 'stats') {
    return (
      <div className="space-y-6">
        <div ref={headerRef} className="reveal flex items-center gap-3">
          <button onClick={() => setView('menu')} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors active:scale-95">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Estatísticas</h1>
            <p className="text-sm text-muted-foreground">{allCards.length} flashcards · {totalReviewed} revisões</p>
          </div>
        </div>

        <div ref={contentRef} className="reveal space-y-6" style={{ transitionDelay: '100ms' }}>
          {/* Overview cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon={Layers} label="Total de Cards" value={String(allCards.length)} color="text-primary" />
            <StatCard icon={Check} label="Taxa de Acerto" value={`${overallAccuracy}%`} color="text-success" />
            <StatCard icon={Brain} label="Para Revisar Hoje" value={String(dueCards.length)} color="text-accent-foreground" />
            <StatCard icon={Trophy} label="Dominados" value={String(masteryDistribution.mastered)} color="text-primary" />
          </div>

          {/* Mastery distribution */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground mb-4">Distribuição de Domínio</h3>
            <div className="grid grid-cols-4 gap-3">
              {(Object.keys(masteryDistribution) as Array<keyof typeof masteryDistribution>).map(level => (
                <div key={level} className="text-center">
                  <div className={cn('mx-auto mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold', MASTERY_COLORS[level])}>
                    {masteryDistribution[level]}
                  </div>
                  <p className="text-xs text-muted-foreground">{MASTERY_LABELS[level]}</p>
                </div>
              ))}
            </div>
            {allCards.length > 0 && (
              <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-border">
                {(['mastered', 'reviewing', 'learning', 'new'] as const).map(level => {
                  const pct = (masteryDistribution[level] / allCards.length) * 100;
                  if (pct === 0) return null;
                  const colors = { mastered: 'bg-success', reviewing: 'bg-primary', learning: 'bg-accent', new: 'bg-muted-foreground/30' };
                  return <div key={level} className={cn('h-full transition-all', colors[level])} style={{ width: `${pct}%` }} />;
                })}
              </div>
            )}
          </div>

          {/* Per-subject */}
          {subjectStats.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground mb-4">Desempenho por Matéria</h3>
              <div className="space-y-3">
                {subjectStats.map(s => (
                  <div key={s.subject} className="flex items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-foreground truncate">{s.subject}</span>
                        <span className="text-muted-foreground ml-2">{s.cards} cards · {s.accuracy}%</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-border">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${s.accuracy}%` }} />
                      </div>
                    </div>
                    {s.due > 0 && (
                      <span className="shrink-0 rounded-md bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent-foreground">{s.due} pendentes</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Session complete view
  if (view === 'study' && sessionComplete) {
    const accuracy = total > 0 ? Math.round((sessionCorrect / total) * 100) : 0;
    const elapsed = Math.round((Date.now() - sessionStartTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return (
      <div className="space-y-6">
        <div ref={headerRef} className="reveal text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
            <Trophy className="h-10 w-10 text-success" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Sessão Completa! 🎉</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {STUDY_MODES.find(m => m.id === mode)?.label}
          </p>
        </div>
        <div ref={contentRef} className="reveal mx-auto max-w-md space-y-4" style={{ transitionDelay: '100ms' }}>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-border bg-card p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-success">{sessionCorrect}</p>
              <p className="text-xs text-muted-foreground">Acertos</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-destructive">{sessionIncorrect}</p>
              <p className="text-xs text-muted-foreground">Erros</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-foreground">{accuracy}%</p>
              <p className="text-xs text-muted-foreground">Precisão</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {mins > 0 ? `${mins}min ${secs}s` : `${secs}s`}
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setSessionComplete(false); setView('menu'); loadCards(); }}
              className="flex-1 rounded-xl border border-border bg-card py-3 text-sm font-medium text-foreground transition-all hover:bg-secondary active:scale-[0.98]">
              Voltar
            </button>
            <button onClick={() => { setSessionComplete(false); startStudy(mode); }}
              className="flex-1 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]">
              Estudar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Study view
  if (view === 'study' && card) {
    return (
      <div className="space-y-6">
        <div ref={headerRef} className="reveal flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => { setView('menu'); loadCards(); }}
              className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors active:scale-95">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                {STUDY_MODES.find(m => m.id === mode)?.label}
              </h1>
              <p className="text-xs text-muted-foreground">{card.subject}{card.theme ? ` · ${card.theme}` : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-success font-medium"><Check className="h-4 w-4" />{sessionCorrect}</span>
            <span className="flex items-center gap-1.5 text-destructive font-medium"><X className="h-4 w-4" />{sessionIncorrect}</span>
          </div>
        </div>

        {/* Progress */}
        <div className="h-1.5 rounded-full bg-border">
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${((currentIndex + 1) / total) * 100}%` }} />
        </div>

        {/* Card */}
        <div ref={contentRef} className="reveal flex justify-center" style={{ transitionDelay: '80ms' }}>
          <div className="perspective-1000 w-full max-w-xl cursor-pointer" onClick={flip}>
            <div className={cn("preserve-3d relative h-72 w-full transition-transform duration-500", isFlipped && "rotate-y-180")}>
              <div className="backface-hidden absolute inset-0 flex items-center justify-center rounded-2xl border border-border bg-card p-8 shadow-lg">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Pergunta</span>
                    <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-medium', MASTERY_COLORS[getMasteryLevel(card)])}>
                      {MASTERY_LABELS[getMasteryLevel(card)]}
                    </span>
                  </div>
                  <p className="text-lg font-medium text-foreground leading-relaxed">{card.front}</p>
                  <p className="mt-6 text-xs text-muted-foreground">Clique para virar</p>
                </div>
              </div>
              <div className="backface-hidden rotate-y-180 absolute inset-0 flex items-center justify-center rounded-2xl border border-primary/20 bg-primary/5 p-8 shadow-lg">
                <div className="text-center">
                  <p className="text-xs font-medium uppercase tracking-widest text-primary">Resposta</p>
                  <p className="mt-4 text-base text-foreground leading-relaxed">{card.back}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Answer buttons */}
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => answerCard(0)} title="Errei"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-destructive/20 bg-destructive/5 text-destructive transition-all duration-200 hover:bg-destructive/10 active:scale-95">
            <X className="h-5 w-5" />
          </button>
          <button onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-all duration-200 hover:bg-secondary active:scale-95">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[3rem] text-center text-sm font-medium text-muted-foreground tabular-nums">
            {currentIndex + 1}/{total}
          </span>
          <button onClick={() => navigate(1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-all duration-200 hover:bg-secondary active:scale-95">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button onClick={() => answerCard(3)} title="Difícil"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-accent-foreground transition-all duration-200 hover:bg-accent/20 active:scale-95">
            <Flame className="h-4 w-4" />
          </button>
          <button onClick={() => answerCard(5)} title="Fácil"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-success/20 bg-success/5 text-success transition-all duration-200 hover:bg-success/10 active:scale-95">
            <Check className="h-5 w-5" />
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          <X className="inline h-3 w-3 text-destructive" /> Errei &nbsp;·&nbsp; <Flame className="inline h-3 w-3 text-accent-foreground" /> Difícil &nbsp;·&nbsp; <Check className="inline h-3 w-3 text-success" /> Fácil
        </p>
      </div>
    );
  }

  // --- MENU VIEW ---
  return (
    <div className="space-y-6">
      <div ref={headerRef} className="reveal flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Flashcards</h1>
          <p className="text-sm text-muted-foreground">
            {allCards.length} cards · {dueCards.length} para revisar hoje
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView('stats')}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground shadow-sm transition-all hover:bg-secondary hover:text-foreground active:scale-[0.97]">
            <BarChart3 className="h-4 w-4" /> Estatísticas
          </button>
        </div>
      </div>

      <div ref={contentRef} className="reveal space-y-6" style={{ transitionDelay: '100ms' }}>
        {/* Subject filter */}
        {subjects.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSubjectFilter('all')}
              className={cn('rounded-lg px-3 py-1.5 text-sm font-medium transition-all active:scale-95',
                subjectFilter === 'all' ? 'bg-primary text-primary-foreground shadow-sm' : 'border border-border bg-card text-muted-foreground hover:bg-secondary')}>
              Todas
            </button>
            {subjects.map(s => (
              <button key={s} onClick={() => setSubjectFilter(s)}
                className={cn('rounded-lg px-3 py-1.5 text-sm font-medium transition-all active:scale-95',
                  subjectFilter === s ? 'bg-primary text-primary-foreground shadow-sm' : 'border border-border bg-card text-muted-foreground hover:bg-secondary')}>
                {s}
              </button>
            ))}
          </div>
        )}

        {allCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <Layers className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold text-foreground">Nenhum flashcard ainda</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm">
              Gere flashcards automaticamente na página <strong>Gerar Materiais</strong> selecionando "Flashcards" como tipo de material.
            </p>
          </div>
        ) : (
          <>
            {/* Due banner */}
            {dueCards.length > 0 && (
              <button onClick={() => startStudy('due')}
                className="w-full flex items-center gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-left transition-all hover:bg-primary/10 active:scale-[0.99]">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{dueCards.length} cards para revisar</p>
                  <p className="text-sm text-muted-foreground">Revisão espaçada baseada no algoritmo SM-2</p>
                </div>
                <Play className="h-5 w-5 text-primary" />
              </button>
            )}

            {/* Study modes grid */}
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">Modos de Estudo</h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {STUDY_MODES.map(m => {
                  const count = m.id === 'due' ? dueCards.length : m.id === 'wrong' ? wrongCards.length : m.id === 'hard' ? hardCards.length : m.id === 'quick' ? Math.min(10, filteredCards.length) : filteredCards.length;
                  return (
                    <button key={m.id} onClick={() => startStudy(m.id)}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:shadow-md hover:border-primary/20 active:scale-[0.98]">
                      <m.icon className={cn('h-5 w-5', m.color)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{m.label}</p>
                        <p className="text-xs text-muted-foreground">{m.desc}</p>
                      </div>
                      <span className="shrink-0 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick mastery overview */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground mb-3">Visão Geral</h3>
              <div className="grid grid-cols-4 gap-3 text-center">
                {(Object.keys(masteryDistribution) as Array<keyof typeof masteryDistribution>).map(level => (
                  <div key={level}>
                    <p className={cn('text-xl font-bold', level === 'mastered' ? 'text-success' : level === 'reviewing' ? 'text-primary' : level === 'learning' ? 'text-accent-foreground' : 'text-muted-foreground')}>
                      {masteryDistribution[level]}
                    </p>
                    <p className="text-xs text-muted-foreground">{MASTERY_LABELS[level]}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <Icon className={cn('h-5 w-5 mb-2', color)} />
      <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
