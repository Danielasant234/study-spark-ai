import { useState } from "react";
import { FileText, Layers, PenTool, Network, Loader2, Copy, Check, Upload } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { useReveal } from "@/hooks/useReveal";
import { generateMaterial } from "@/lib/ai";
import { toast } from "@/hooks/use-toast";

const materialTypes = [
  { id: "summary", label: "Resumo", icon: FileText, description: "Resumo estruturado com conceitos-chave" },
  { id: "flashcards", label: "Flashcards", icon: Layers, description: "Perguntas e respostas para revisão" },
  { id: "exercises", label: "Exercícios", icon: PenTool, description: "Exercícios variados com gabarito" },
  { id: "mindmap", label: "Mapa Mental", icon: Network, description: "Organização hierárquica de conceitos" },
];

export default function GeneratePage() {
  const [content, setContent] = useState("");
  const [selectedType, setSelectedType] = useState("summary");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const headerRef = useReveal();
  const formRef = useReveal();

  const handleGenerate = async () => {
    if (!content.trim()) {
      toast({ title: "Conteúdo vazio", description: "Cole ou digite o conteúdo para gerar o material.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setResult("");
    try {
      const res = await generateMaterial(content, selectedType);
      setResult(res);
      toast({ title: "Material gerado!", description: "Seu material de estudo está pronto." });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message || "Erro ao gerar material", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "text/plain" || file.name.endsWith(".md") || file.name.endsWith(".txt")) {
      const text = await file.text();
      setContent(text);
      toast({ title: "Arquivo carregado", description: file.name });
    } else {
      toast({ title: "Formato não suportado", description: "Use arquivos .txt ou .md por enquanto. Suporte a PDF em breve!", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div ref={headerRef} className="reveal">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Gerar Materiais</h1>
        <p className="text-sm text-muted-foreground">Cole seu conteúdo e a IA gera materiais de estudo automaticamente</p>
      </div>

      <div ref={formRef} className="reveal grid gap-6 lg:grid-cols-2" style={{ transitionDelay: "100ms" }}>
        {/* Input side */}
        <div className="space-y-4">
          {/* Type selector */}
          <div className="grid grid-cols-2 gap-2">
            {materialTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border p-3 text-left text-sm transition-all duration-200 active:scale-[0.98]",
                  selectedType === type.id
                    ? "border-primary bg-primary/5 text-primary shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:bg-secondary"
                )}
              >
                <type.icon className="h-4 w-4 flex-shrink-0" />
                <div>
                  <p className="font-medium">{type.label}</p>
                  <p className="text-xs opacity-70">{type.description}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Content input */}
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Cole aqui o conteúdo da aula, texto, transcrição ou anotações..."
              rows={12}
              className="w-full rounded-xl border border-border bg-card p-4 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none transition-shadow focus:shadow-md focus:border-primary/30"
            />
            <label className="absolute bottom-3 right-3 flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
              <Upload className="h-3.5 w-3.5" />
              Upload
              <input type="file" accept=".txt,.md" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isLoading || !content.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 disabled:opacity-50 active:scale-[0.98]"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Gerar {materialTypes.find((t) => t.id === selectedType)?.label}
              </>
            )}
          </button>
        </div>

        {/* Output side */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Resultado</h3>
            {result && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copiado!" : "Copiar"}
              </button>
            )}
          </div>
          <div className="max-h-[500px] overflow-y-auto p-4">
            {result ? (
              <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground prose-code:text-primary">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span>A IA está gerando seu material...</span>
                  </div>
                ) : (
                  "O material gerado aparecerá aqui"
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
