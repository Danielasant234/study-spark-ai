import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Brain, User, Sparkles, Trash2, Plus, MessageSquare, Clock, ChevronLeft, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { streamChat, type Message } from "@/lib/ai";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
};

const suggestions = [
  "Explique o princípio da separação dos poderes",
  "Gere 5 exercícios sobre derivadas com gabarito",
  "Resuma a Era Vargas em tópicos organizados",
  "Crie um plano de estudos semanal para o ENEM",
  "Faça um mapa mental sobre fotossíntese",
  "Crie flashcards sobre a Revolução Francesa",
];

const WELCOME_MSG: Message = {
  role: "assistant",
  content:
    "Olá! 👋 Sou o **StudyAI**, seu assistente de estudos inteligente.\n\nPosso te ajudar com:\n- 📚 **Explicações** claras sobre qualquer tema\n- ✏️ **Exercícios** com gabarito\n- 📝 **Resumos** estruturados\n- 🧠 **Flashcards** para revisão\n- 📅 **Planos de estudo** personalizados\n- 🗺️ **Mapas mentais** textuais\n\nComo posso te ajudar hoje?",
};

export default function Chat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MSG]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { loadConversations(); }, []);

  const loadConversations = async () => {
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .order("updated_at", { ascending: false });
    if (data) setConversations(data as unknown as Conversation[]);
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const saveConversation = async (msgs: Message[], convId: string | null) => {
    const title = msgs.find((m) => m.role === "user")?.content.slice(0, 60) || "Nova conversa";
    if (convId) {
      await supabase
        .from("conversations")
        .update({ messages: msgs as any, title, updated_at: new Date().toISOString() })
        .eq("id", convId);
    } else {
      const { data } = await supabase
        .from("conversations")
        .insert({ messages: msgs as any, title, user_id: user?.id })
        .select()
        .single();
      if (data) {
        setActiveConvId(data.id);
        convId = data.id;
      }
    }
    loadConversations();
    return convId;
  };

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;
      const userMsg: Message = { role: "user", content: text.trim() };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setInput("");
      setIsStreaming(true);

      let assistantContent = "";
      let currentConvId = activeConvId;

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
        onDone: async () => {
          setIsStreaming(false);
          inputRef.current?.focus();
          const finalMsgs = [...newMessages, { role: "assistant" as const, content: assistantContent }];
          await saveConversation(finalMsgs, currentConvId);
        },
        onError: (error) => {
          setIsStreaming(false);
          toast({ title: "Erro", description: error, variant: "destructive" });
        },
      });
    },
    [messages, isStreaming, activeConvId]
  );

  const loadConversation = (conv: Conversation) => {
    setActiveConvId(conv.id);
    setMessages(conv.messages as Message[]);
    setShowSidebar(false);
  };

  const newConversation = () => {
    setActiveConvId(null);
    setMessages([WELCOME_MSG]);
    setShowSidebar(false);
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("conversations").delete().eq("id", id);
    if (activeConvId === id) newConversation();
    loadConversations();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] lg:h-[calc(100vh-4rem)] gap-0 relative">
      {/* Mobile overlay */}
      {showSidebar && (
        <div className="fixed inset-0 z-20 bg-black/30 md:hidden" onClick={() => setShowSidebar(false)} />
      )}

      {/* Conversation sidebar */}
      <div
        className={cn(
          "flex-shrink-0 flex flex-col border-r border-border bg-surface-sunken transition-all duration-300 z-30",
          "fixed inset-y-0 left-0 w-64 md:relative md:inset-auto",
          showSidebar ? "translate-x-0" : "-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden md:border-r-0"
        )}
      >
        <div className="flex items-center justify-between p-3 border-b border-border">
          <span className="text-sm font-semibold text-foreground">Conversas</span>
          <button
            onClick={newConversation}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => loadConversation(conv)}
              className={cn(
                "group flex w-full items-start gap-2 rounded-lg p-2.5 text-left text-sm transition-colors",
                activeConvId === conv.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <MessageSquare className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium text-xs">{conv.title}</p>
                <p className="text-[10px] opacity-60 flex items-center gap-1 mt-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  {new Date(conv.updated_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <button
                onClick={(e) => deleteConversation(conv.id, e)}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-foreground hover:text-destructive transition-all"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </button>
          ))}
          {conversations.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">Nenhuma conversa salva</p>
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col min-w-0">
        <div className="flex-shrink-0 flex items-center justify-between px-1 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              {showSidebar ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </button>
            <div>
              <h1 className="font-heading text-lg sm:text-xl font-bold tracking-tight text-foreground">Assistente IA</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Tire dúvidas e gere materiais em tempo real</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto rounded-xl border border-border bg-surface-sunken p-3 sm:p-4">
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex gap-2 sm:gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
              {msg.role === "assistant" && (
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Brain className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[85%] sm:max-w-[75%] rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm leading-relaxed",
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
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
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
            <div className="mt-4 grid gap-2 grid-cols-1 sm:grid-cols-2">
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
        <div className="mt-3 flex-shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-end gap-2 rounded-xl border border-border bg-card p-2 shadow-sm transition-shadow focus-within:shadow-md"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua pergunta..."
              disabled={isStreaming}
              rows={1}
              className="flex-1 bg-transparent px-2 sm:px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none disabled:opacity-50 resize-none max-h-32"
              style={{ minHeight: "40px" }}
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
    </div>
  );
}
