import { useState, useMemo, useRef } from "react";
import { FileText, Download, Clock, Eye, Trash2, Loader2, X, Layers, PenTool, Network, Filter, MapPin, Image } from "lucide-react";
import ReactMarkdown from "react-markdown";
import MindMap, { type MindMapData, type MindMapHandle } from "@/components/MindMap";
import { useReveal } from "@/hooks/useReveal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { downloadMarkdownAsPdf } from "@/lib/pdf";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const typeIcons: Record<string, any> = {
  summary: FileText,
  flashcards: Layers,
  exercises: PenTool,
  mindmap: Network,
};

const typeLabels: Record<string, string> = {
  summary: "Resumo",
  flashcards: "Flashcards",
  exercises: "Exercícios",
  mindmap: "Mapa Mental",
};

type Material = {
  id: string;
  title: string;
  type: string;
  content: string;
  source_preview: string | null;
  created_at: string;
  subject: string | null;
};

export default function Summaries() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [viewingMaterial, setViewingMaterial] = useState<Material | null>(null);
  const [filterSubject, setFilterSubject] = useState<string>("All");
  const mindMapRef = useRef<MindMapHandle>(null);
  const headerRef = useReveal();

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["generated_materials", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_materials")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Material[];
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Also delete linked flashcards
      await supabase.from("flashcards").delete().eq("source_material_id", id);
      const { error } = await supabase.from("generated_materials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generated_materials"] });
      toast({ title: "Material excluído" });
      if (viewingMaterial) setViewingMaterial(null);
    },
  });

  const handleDownloadPdf = (material: Material) => {
    const html = material.content
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
    downloadMarkdownAsPdf(material.title, `<p>${html}</p>`);
  };

  const formatDate = (dateStr: string) => {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR });
  };

  const subjects = Array.from(new Set(materials.map(m => m.subject || "Geral")));
  const filteredMaterials = filterSubject === "All" 
    ? materials 
    : materials.filter(m => (m.subject || "Geral") === filterSubject);

  if (viewingMaterial) {
    return (
      <div className="space-y-4 pb-10">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            onClick={() => setViewingMaterial(null)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-all self-start"
          >
            <X className="h-4 w-4" />
            Voltar
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-heading text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">{viewingMaterial.title}</h1>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {typeLabels[viewingMaterial.type] || viewingMaterial.type} · {viewingMaterial.subject || "Geral"} · {formatDate(viewingMaterial.created_at)}
            </p>
          </div>
          {viewingMaterial.type === "mindmap" ? (
            <button
              onClick={() => mindMapRef.current?.exportPng()}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all self-start"
            >
              <Image className="h-4 w-4" />
              Download PNG
            </button>
          ) : (
            <button
              onClick={() => handleDownloadPdf(viewingMaterial)}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all self-start"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>
          )}
        </div>
        {viewingMaterial.type === "mindmap" ? (
          (() => {
            try {
              const raw = viewingMaterial.content;
              const jsonStr = raw.includes("```") ? raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim() : raw.trim();
              const parsed: MindMapData = JSON.parse(jsonStr);
              if (parsed.nodes && parsed.edges) {
                return <MindMap data={parsed} />;
              }
            } catch { /* fall through */ }
            return (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <p className="text-sm text-muted-foreground">Não foi possível renderizar o mapa mental.</p>
              </div>
            );
          })()
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-10 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-16 -mt-16" />
            <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-li:text-foreground/90 prose-code:text-primary relative z-10">
              <ReactMarkdown>{viewingMaterial.content}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div ref={headerRef} className="reveal flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Biblioteca de Estudos</h1>
          <p className="text-sm text-muted-foreground">Todos os seus resumos e materiais em um só lugar</p>
        </div>
        
        {materials.length > 0 && (
          <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-1.5 self-start">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <select 
              value={filterSubject} 
              onChange={(e) => setFilterSubject(e.target.value)}
              className="bg-transparent text-xs font-bold uppercase tracking-wider text-foreground outline-none cursor-pointer"
            >
              <option value="All">Todas as matérias</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:gap-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
            <p className="mt-4 text-sm text-muted-foreground font-medium">Abrindo seus arquivos...</p>
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4 rounded-3xl border border-dashed border-border bg-secondary/10">
            <div className="h-16 w-16 rounded-full bg-secondary/30 flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="text-base font-bold text-foreground">Nenhum material encontrado</p>
            <p className="text-sm text-muted-foreground max-w-xs mt-1">
              {filterSubject !== "All" ? `Você ainda não gerou materiais para "${filterSubject}".` : "Sua biblioteca está vazia. Comece gerando novos materiais a partir dos seus estudos."}
            </p>
          </div>
        ) : (
          filteredMaterials.map((material) => {
            const Icon = typeIcons[material.type] || FileText;
            return (
              <div
                key={material.id}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 transition-all duration-300 hover:shadow-md hover:border-primary/20"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary transition-colors">
                    <Icon className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-foreground truncate text-base">{material.title}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-y-1 gap-x-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      <span className="text-primary">{typeLabels[material.type] || material.type}</span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3" />
                        {material.subject || "Geral"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {formatDate(material.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto sm:opacity-0 transition-opacity group-hover:opacity-100">
                  <button 
                    onClick={() => setViewingMaterial(material)} 
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
                    title="Visualizar"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleDownloadPdf(material)} 
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
                    title="Baixar PDF"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => deleteMutation.mutate(material.id)} 
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
                    disabled={deleteMutation.isPending}
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
