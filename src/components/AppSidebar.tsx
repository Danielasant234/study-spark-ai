import { BookOpen, Brain, Compass, GraduationCap, LayoutDashboard, MessageCircle, FileText, Layers, Wand2, Mic } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/subjects", icon: BookOpen, label: "Matérias" },
  { to: "/flashcards", icon: Layers, label: "Flashcards" },
  { to: "/generate", icon: Wand2, label: "Gerar Material" },
  { to: "/summaries", icon: FileText, label: "Resumos" },
  { to: "/transcription", icon: Mic, label: "Transcrição" },
  { to: "/chat", icon: MessageCircle, label: "Assistente IA" },
];

interface AppSidebarProps {
  onNavigate?: () => void;
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const location = useLocation();
  const [sessionsToday, setSessionsToday] = useState(0);

  useEffect(() => {
    const fetchSessions = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from('review_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('ended_at', today.toISOString());
      if (count !== null) setSessionsToday(count);
    };

    fetchSessions();

    const channel = supabase
      .channel('sidebar-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'review_sessions' }, () => {
        fetchSessions();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col border-r border-border bg-card">
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Compass className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-heading text-base font-bold tracking-tight text-foreground">StudyAI</h1>
          <p className="text-xs text-muted-foreground">Sua jornada de estudos</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-ocean-light text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" strokeWidth={1.75} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Journey tracker */}
      <div className="border-t border-border p-4">
        <div className="rounded-xl bg-secondary p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-secondary-foreground">
            <Compass className="h-3.5 w-3.5" strokeWidth={1.75} />
            Jornada de hoje
          </div>
          <p className="mt-1.5 font-heading text-2xl font-bold tracking-tight text-foreground">{sessionsToday}</p>
          <p className="text-xs text-muted-foreground">sessões concluídas</p>
          <div className="mt-3 h-1.5 rounded-full bg-border">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 progress-glow"
              style={{ width: `${Math.min(100, (sessionsToday / 5) * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">Meta diária: 5 sessões</p>
        </div>
      </div>
    </aside>
  );
}
