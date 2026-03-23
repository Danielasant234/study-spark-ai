import { useState } from "react";
import { RotateCcw, ChevronLeft, ChevronRight, Check, X, Shuffle } from "lucide-react";
import { useReveal } from "@/hooks/useReveal";
import { cn } from "@/lib/utils";

const sampleCards = [
  { front: "O que é o princípio da legalidade?", back: "Ninguém será obrigado a fazer ou deixar de fazer alguma coisa senão em virtude de lei (Art. 5°, II, CF/88)." },
  { front: "Quais são os fundamentos da República?", back: "Soberania, cidadania, dignidade da pessoa humana, valores sociais do trabalho e da livre iniciativa, pluralismo político (Art. 1°, CF/88)." },
  { front: "O que é controle de constitucionalidade?", back: "Mecanismo de verificação da compatibilidade de leis e atos normativos com a Constituição Federal." },
  { front: "Defina cláusula pétrea.", back: "São normas constitucionais que não podem ser abolidas por emenda constitucional (Art. 60, §4°, CF/88)." },
  { front: "O que é o habeas corpus?", back: "Remédio constitucional que protege o direito de locomoção contra ilegalidade ou abuso de poder (Art. 5°, LXVIII, CF/88)." },
];

export default function Flashcards() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [known, setKnown] = useState<number[]>([]);
  const [unknown, setUnknown] = useState<number[]>([]);
  const headerRef = useReveal();
  const cardRef = useReveal();

  const card = sampleCards[currentIndex];
  const total = sampleCards.length;

  const flip = () => setIsFlipped(!isFlipped);
  
  const next = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex((i) => (i + 1) % total), 200);
  };

  const prev = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex((i) => (i - 1 + total) % total), 200);
  };

  const markKnown = () => {
    setKnown((prev) => [...prev, currentIndex]);
    next();
  };

  const markUnknown = () => {
    setUnknown((prev) => [...prev, currentIndex]);
    next();
  };

  return (
    <div className="space-y-6">
      <div ref={headerRef} className="reveal flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Flashcards</h1>
          <p className="text-sm text-muted-foreground">Direito Constitucional · {total} cards</p>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5 text-success font-medium">
            <Check className="h-4 w-4" /> {known.length} sabem
          </span>
          <span className="flex items-center gap-1.5 text-destructive font-medium">
            <X className="h-4 w-4" /> {unknown.length} revisar
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-border">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
        />
      </div>

      {/* Card */}
      <div ref={cardRef} className="reveal flex justify-center" style={{ transitionDelay: "100ms" }}>
        <div
          className="perspective-1000 w-full max-w-xl cursor-pointer"
          onClick={flip}
        >
          <div
            className={cn(
              "preserve-3d relative h-72 w-full transition-transform duration-500",
              isFlipped && "rotate-y-180"
            )}
          >
            {/* Front */}
            <div className="backface-hidden absolute inset-0 flex items-center justify-center rounded-2xl border border-border bg-card p-8 shadow-lg">
              <div className="text-center">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Pergunta</p>
                <p className="mt-4 text-lg font-medium text-foreground leading-relaxed">{card.front}</p>
                <p className="mt-6 text-xs text-muted-foreground">Clique para virar</p>
              </div>
            </div>
            {/* Back */}
            <div className="backface-hidden rotate-y-180 absolute inset-0 flex items-center justify-center rounded-2xl border border-primary/20 bg-primary/5 p-8 shadow-lg">
              <div className="text-center">
                <p className="text-xs font-medium uppercase tracking-widest text-primary">Resposta</p>
                <p className="mt-4 text-base text-foreground leading-relaxed">{card.back}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={markUnknown}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-destructive/20 bg-destructive/5 text-destructive transition-all duration-200 hover:bg-destructive/10 active:scale-95"
        >
          <X className="h-5 w-5" />
        </button>
        <button
          onClick={prev}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-all duration-200 hover:bg-secondary active:scale-95"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[3rem] text-center text-sm font-medium text-muted-foreground">
          {currentIndex + 1}/{total}
        </span>
        <button
          onClick={next}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-all duration-200 hover:bg-secondary active:scale-95"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          onClick={markKnown}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-success/20 bg-success/5 text-success transition-all duration-200 hover:bg-success/10 active:scale-95"
        >
          <Check className="h-5 w-5" />
        </button>
      </div>

      <div className="flex justify-center">
        <button className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <Shuffle className="h-4 w-4" />
          Embaralhar
        </button>
      </div>
    </div>
  );
}
