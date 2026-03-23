import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Brain, User, Sparkles, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { useReveal } from "@/hooks/useReveal";
import { streamChat, type Message } from "@/lib/ai";
import { toast } from "@/hooks/use-toast";

const suggestions = [
  "Explique o princípio da separação dos poderes",
  "Gere 5 exercícios sobre derivadas com gabarito",
  "Resuma a Era Vargas em tópicos organizados",
  "Crie um plano de estudos semanal para o ENEM",
  "Faça um mapa mental sobre fotossíntese",
  "Crie flashcards sobre a Revolução Francesa",
];

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Olá! 👋 Sou o **StudyAI**, seu assistente de estudos inteligente.\n\nPosso te ajudar com:\n- 📚 **Explicações** claras sobre qualquer tema\n- ✏️ **Exercícios** com gabarito\n- 📝 **Resumos** estruturados\n- 🧠 **Flashcards** para revisão\n- 📅 **Planos de estudo** personalizados\n- 🗺️ **Mapas mentais** textuais\n\nComo posso te ajudar hoje?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const headerRef = useReveal();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    let assistantContent = "";

    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && prev.length === newMessages.length + 1) {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
        }
        return [...prev, { role: "assistant", content: assistantContent }];
      });
    };

    await streamChat({
      messages: newMessages,
      onDelta: updateAssistant,
      onDone: () => {
        setIsStreaming(false);
        inputRef.current?.focus();
      },
      onError: (error) => {
        setIsStreaming(false);
        toast({ title: "Erro", description: error, variant: "destructive" });
      },
    });
  }, [messages, isStreaming]);

  const clearChat = () => {
    setMessages([{
      role: "assistant",
      content: "Chat limpo! Como posso te ajudar?",
    }]);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div ref={headerRef} className="reveal flex-shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Assistente IA</h1>
          <p className="text-sm text-muted-foreground">Tire dúvidas e gere materiais de estudo em tempo real</p>
        </div>
        {messages.length > 1 && (
          <button
            onClick={clearChat}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Limpar
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="mt-4 flex-1 space-y-4 overflow-y-auto rounded-xl border border-border bg-surface-sunken p-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}
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
              {msg.role === "assistant" ? (
                <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground prose-code:text-primary prose-code:bg-primary/5 prose-code:px-1 prose-code:rounded">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
            </div>
            {msg.role === "user" && (
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-secondary">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
        {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
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
          className="flex items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-sm transition-shadow focus-within:shadow-md"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua pergunta..."
            disabled={isStreaming}
            className="flex-1 bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all duration-200 hover:bg-primary/90 disabled:opacity-40 active:scale-95"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
