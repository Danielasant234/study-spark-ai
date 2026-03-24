import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { BookOpen, Plus, MoreVertical, Pencil, Trash2, X } from "lucide-react";
import { useReveal } from "@/hooks/useReveal";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

type Subject = {
  id: string;
  name: string;
  cards: number;
  summaries: number;
  progress: number;
  color: string;
};

const defaultSubjects: Subject[] = [];

const colorOptions = [
  "hsl(158, 64%, 32%)",
  "hsl(38, 92%, 55%)",
  "hsl(210, 80%, 55%)",
  "hsl(340, 65%, 50%)",
  "hsl(270, 60%, 55%)",
  "hsl(15, 75%, 50%)",
  "hsl(180, 60%, 40%)",
  "hsl(50, 85%, 50%)",
];

export default function Subjects() {
  const location = useLocation();
  const [subjects, setSubjects] = useState<Subject[]>(defaultSubjects);
  const [showAddDialog, setShowAddDialog] = useState(location.state?.openNewSubject || false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(colorOptions[0]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const headerRef = useReveal();
  const gridRef = useReveal();

  useEffect(() => {
    if (location.state?.openNewSubject) {
      setShowAddDialog(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const addSubject = () => {
    if (!newName.trim()) return;
    const subject: Subject = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      cards: 0,
      summaries: 0,
      progress: 0,
      color: newColor,
    };
    setSubjects((prev) => [...prev, subject]);
    setNewName("");
    setNewColor(colorOptions[0]);
    setShowAddDialog(false);
    toast({ title: "Matéria criada", description: `"${subject.name}" foi adicionada.` });
  };

  const updateSubject = () => {
    if (!editingSubject || !newName.trim()) return;
    setSubjects((prev) =>
      prev.map((s) => (s.id === editingSubject.id ? { ...s, name: newName.trim(), color: newColor } : s))
    );
    setEditingSubject(null);
    setNewName("");
    toast({ title: "Matéria atualizada" });
  };

  const deleteSubject = (id: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    setOpenMenuId(null);
    toast({ title: "Matéria excluída" });
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
      <div ref={headerRef} className="reveal flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Matérias</h1>
          <p className="text-sm text-muted-foreground">Organize seus estudos por área de conhecimento</p>
        </div>
        <button
          onClick={() => {
            setShowAddDialog(true);
            setNewName("");
            setNewColor(colorOptions[0]);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 active:scale-[0.97]"
        >
          <Plus className="h-4 w-4" />
          Nova Matéria
        </button>
      </div>

      {/* Add/Edit Dialog */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={closeDialog}>
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">
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
                disabled={!newName.trim()}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 active:scale-[0.98]"
              >
                {editingSubject ? "Salvar" : "Criar Matéria"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div ref={gridRef} className="reveal grid gap-4 sm:grid-cols-2 lg:grid-cols-3" style={{ transitionDelay: "100ms" }}>
        {subjects.map((subject) => (
          <div
            key={subject.id}
            className="group cursor-pointer rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:shadow-md active:scale-[0.98]"
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
                  className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-secondary"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {openMenuId === subject.id && (
                  <div className="absolute right-0 top-8 z-10 w-40 rounded-lg border border-border bg-card py-1 shadow-lg">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(subject);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSubject(subject.id);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
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
              <span>{subject.cards} flashcards</span>
              <span>{subject.summaries} resumos</span>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Progresso</span>
                <span className="font-semibold text-foreground">{subject.progress}%</span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-border">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${subject.progress}%`, backgroundColor: subject.color }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
