import { BookOpen, Brain, GraduationCap, LayoutDashboard, MessageCircle, FileText, Layers, Wand2, Mic } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/subjects", icon: BookOpen, label: "Matérias" },
  { to: "/flashcards", icon: Layers, label: "Flashcards" },
  { to: "/generate", icon: Wand2, label: "Gerar Material" },
  { to: "/summaries", icon: FileText, label: "Resumos" },
  { to: "/transcription", icon: Mic, label: "Transcrição" },
  { to: "/chat", icon: MessageCircle, label: "Assistente IA" },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col border-r border-border bg-surface-raised">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <GraduationCap className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-foreground">StudyAI</h1>
          <p className="text-xs text-muted-foreground">Estudo inteligente</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className="h-4.5 w-4.5" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <div className="rounded-lg bg-secondary p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-secondary-foreground">
            <Brain className="h-4 w-4" />
            Sessões hoje
          </div>
          <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">3</p>
          <div className="mt-2 h-1.5 rounded-full bg-border">
            <div className="h-full w-3/5 rounded-full bg-primary transition-all" />
          </div>
        </div>
      </div>
    </aside>
  );
}
