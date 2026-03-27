import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { BookOpen, Plus, MoreVertical, Pencil, Trash2, X, Loader2 } from "lucide-react";
import { useReveal } from "@/hooks/useReveal";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Subject = {
  id: string;
  name: string;
  cards: number;
  summaries: number;
  progress: number;
  color: string;
};

const colorOptions = [
  "hsl(210, 75%, 35%)",
  "hsl(42, 78%, 52%)",
  "hsl(4, 65%, 52%)",
  "hsl(340, 65%, 50%)",
  "hsl(270, 60%, 55%)",
  "hsl(15, 75%, 50%)",
  "hsl(180, 60%, 40%)",
  "hsl(50, 85%, 50%)",
];

export default function Subjects() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(colorOptions[0]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const headerRef = useReveal();
  const gridRef = useReveal();

  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ["subjects", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects" as any)
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as Subject[];
    },
    enabled: !!user,
  });

  const addSubjectMutation = useMutation({
    mutationFn: async (newSub: { name: string; color: string }) => {
      const { data, error } = await supabase
        .from("subjects" as any)
        .insert({ name: newSub.name, color: newSub.color, user_id: user?.id || '' } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      toast({ title: "Matéria criada", description: `"${newName}" foi adicionada.` });
      closeDialog();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao criar matéria", description: error.message, variant: "destructive" });
    },
  });

  const updateSubjectMutation = useMutation({
    mutationFn: async (sub: { id: string; name: string; color: string }) => {
      const { error } = await supabase
        .from("subjects" as any)
        .update({ name: sub.name, color: sub.color } as any)
        .eq("id", sub.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      toast({ title: "Matéria atualizada" });
      closeDialog();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    },
  });

  const deleteSubjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subjects" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      toast({ title: "Matéria excluída" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (location.state?.openNewSubject || params.get("new") === "true") {
      setShowAddDialog(true);
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [location]);

  const addSubject = () => {
    if (!newName.trim()) return;
    addSubjectMutation.mutate({ name: newName.trim(), color: newColor });
  };

  const updateSubject = () => {
    if (!editingSubject || !newName.trim()) return;
    updateSubjectMutation.mutate({ id: editingSubject.id, name: newName.trim(), color: newColor });
  };

  const deleteSubject = (id: string) => {
    if (confirm("Deseja realmente excluir esta matéria?")) {
      deleteSubjectMutation.mutate(id);
      setOpenMenuId(null);
    }
  };

  const openEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setNewName(subject.name);
    setNewColor(subject.color);
    setOpenMenuId(null);
  };

  const closeDialog = () => {
    setShowAddDialog(false);
    setEditingSubject(null);
    setNewName("");
    setNewColor(colorOptions[0]);
  };

  const isDialogOpen = showAddDialog || editingSubject !== null;

  return (
    <div className="space-y-6">
      <div ref={headerRef} className="reveal flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Matérias</h1>
          <p className="text-sm text-muted-foreground">Organize seus estudos por área de conhecimento</p>
        </div>
        <button
          onClick={() => {
            setShowAddDialog(true);
            setNewName("");
            setNewColor(colorOptions[0]);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 active:scale-[0.97]"
        >
          <Plus className="h-4 w-4" />
          Nova Matéria
        </button>
      </div>

      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeDialog}>
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg font-bold text-foreground">
                {editingSubject ? "Editar Matéria" : "Nova Matéria"}
              </h2>
              <button onClick={closeDialog} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Nome da matéria</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Matemática, Direito Civil..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/30 focus:shadow-sm transition-all"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") editingSubject ? updateSubject() : addSubject();
                  }}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Cor</label>
                <div className="flex gap-2 flex-wrap">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewColor(color)}
                      className={cn(
                        "h-8 w-8 rounded-full border-2 transition-all duration-200",
                        newColor === color ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <button
                onClick={editingSubject ? updateSubject : addSubject}
                disabled={!newName.trim() || addSubjectMutation.isPending || updateSubjectMutation.isPending}
                className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 active:scale-[0.98]"
              >
                {addSubjectMutation.isPending || updateSubjectMutation.isPending ? "Salvando..." : (editingSubject ? "Salvar" : "Criar Matéria")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div ref={gridRef} className="reveal grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ transitionDelay: "100ms" }}>
        {isLoading ? (
          <div className="col-span-full py-20 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary/40" />
            <p className="mt-2 text-sm text-muted-foreground">Carregando matérias...</p>
          </div>
        ) : subjects.length > 0 ? (
          subjects.map((subject) => (
            <div
              key={subject.id}
              className="group cursor-pointer rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm transition-all duration-300 hover:shadow-md active:scale-[0.98]"
            >
              <div className="flex items-start justify-between">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${subject.color}15` }}
                >
                  <BookOpen className="h-5 w-5" style={{ color: subject.color }} />
                </div>
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === subject.id ? null : subject.id);
                    }}
                    className="rounded-md p-1.5 text-muted-foreground transition-opacity hover:bg-secondary sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {openMenuId === subject.id && (
                    <div className="absolute right-0 top-8 z-10 w-40 rounded-lg border border-border bg-card py-1 shadow-lg">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(subject); }}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteSubject(subject.id); }}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Excluir
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <h3 className="mt-3 font-semibold text-foreground">{subject.name}</h3>
              <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                <span>{subject.cards || 0} flashcards</span>
                <span>{subject.summaries || 0} resumos</span>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Progresso</span>
                  <span className="font-semibold text-foreground">{subject.progress || 0}%</span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-border">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${subject.progress || 0}%`, backgroundColor: subject.color }}
                  />
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center rounded-xl border border-dashed border-border bg-secondary/30">
            <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <p className="mt-4 text-sm text-muted-foreground">Nenhuma matéria encontrada.</p>
            <p className="text-xs text-muted-foreground/60">Crie sua primeira matéria para começar a organizar seus estudos.</p>
          </div>
        )}
      </div>
    </div>
  );
}
