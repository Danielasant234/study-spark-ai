import { useState, useRef, useEffect } from "react";
import { Send, Brain, User, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReveal } from "@/hooks/useReveal";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const suggestions = [
  "Explique o princípio da separação dos poderes",
  "Gere 5 exercícios sobre derivadas",
  "Resuma a Era Vargas em tópicos",
  "Crie um plano de estudos semanal",
];

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Olá! Sou seu assistente de estudos com IA. Posso ajudar com dúvidas, gerar exercícios, criar resumos e montar planos de estudo. Como posso te ajudar?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerRef = useReveal();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Simulated response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Esta é uma resposta de demonstração. Para respostas reais, habilite o **Lovable Cloud** para integrar com IA generativa. A IA poderá responder dúvidas, gerar exercícios personalizados e criar materiais de estudo sob demanda.",
        },
      ]);
      setIsTyping(false);
    }, 1200);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div ref={headerRef} className="reveal flex-shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Assistente IA</h1>
        <p className="text-sm text-muted-foreground">Tire dúvidas e gere materiais de estudo</p>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="mt-4 flex-1 space-y-4 overflow-y-auto rounded-xl border border-border bg-surface-sunken p-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-3",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {msg.role === "assistant" && (
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Brain className="h-4 w-4 text-primary" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-foreground shadow-sm"
              )}
            >
              {msg.content}
            </div>
            {msg.role === "user" && (
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-secondary">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        {messages.length <= 1 && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="flex items-start gap-2 rounded-xl border border-border bg-card p-3 text-left text-sm text-foreground shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.98]"
              >
                <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="mt-4 flex-shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-sm"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua pergunta..."
            className="flex-1 bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all duration-200 hover:bg-primary/90 disabled:opacity-40 active:scale-95"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
