import { useState, useEffect } from "react";
import { FileText, Download, Clock, Eye, Trash2, Loader2, X, Layers, PenTool, Network } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useReveal } from "@/hooks/useReveal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { downloadMarkdownAsPdf } from "@/lib/pdf";
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
};

export default function Summaries() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingMaterial, setViewingMaterial] = useState<Material | null>(null);
  const headerRef = useReveal();
  const listRef = useReveal();

  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("generated_materials")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setMaterials(data as Material[]);
    if (error) toast({ title: "Erro", description: "Não foi possível carregar materiais", variant: "destructive" });
    setLoading(false);
  };

  const deleteMaterial = async (id: string) => {
    await supabase.from("generated_materials").delete().eq("id", id);
    setMaterials((prev) => prev.filter((m) => m.id !== id));
    if (viewingMaterial?.id === id) setViewingMaterial(null);
    toast({ title: "Material excluído" });
  };

  const handleDownloadPdf = (material: Material) => {
    // Convert markdown to simple HTML for PDF
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
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return "Agora";
    if (diffHours < 24) return `Há ${diffHours}h`;
    if (diffDays < 7) return `Há ${diffDays} dia${diffDays > 1 ? "s" : ""}`;
    return date.toLocaleDateString("pt-BR");
  };

  // Viewing a material detail
  if (viewingMaterial) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewingMaterial(null)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
            Voltar
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight text-foreground">{viewingMaterial.title}</h1>
            <p className="text-xs text-muted-foreground">
              {typeLabels[viewingMaterial.type] || viewingMaterial.type} · {formatDate(viewingMaterial.created_at)}
            </p>
          </div>
          <button
            onClick={() => handleDownloadPdf(viewingMaterial)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Download className="h-4 w-4" />
            Baixar PDF
          </button>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground prose-code:text-primary">
            <ReactMarkdown>{viewingMaterial.content}</ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div ref={headerRef} className="reveal">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Materiais Gerados</h1>
        <p className="text-sm text-muted-foreground">Resumos, flashcards, exercícios e mapas mentais gerados pela IA</p>
      </div>

      <div ref={listRef} className="reveal space-y-3" style={{ transitionDelay: "100ms" }}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : materials.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum material gerado ainda</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Vá para "Gerar Material" para criar resumos, flashcards e mais
            </p>
          </div>
        ) : (
          materials.map((material) => {
            const Icon = typeIcons[material.type] || FileText;
            return (
              <div
                key={material.id}
                className="group flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-300 hover:shadow-md"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{material.title}</h3>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-medium">
                        {typeLabels[material.type] || material.type}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(material.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => setViewingMaterial(material)}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDownloadPdf(material)}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteMaterial(material.id)}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
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
