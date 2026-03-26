import { useState, useRef, useCallback } from "react";
import { Upload, Loader2, CheckCircle, Edit3, Sparkles, FileText, Layers, PenTool, Network, Download, ChevronRight, AlertCircle, Clock, Mic } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { generateMaterial } from "@/lib/ai";
import { downloadMarkdownAsPdf } from "@/lib/pdf";
import { splitAudioRobustly } from "@/lib/audio-processor";
import { Progress } from "@/components/ui/progress";

type Step = "upload" | "transcribing" | "review" | "analyzing" | "analyzed" | "generating" | "done";

const CHUNK_SIZE = 5 * 1024 * 1024;

const materialOptions = [
  { id: "summary", label: "Resumo", icon: FileText },
  { id: "flashcards", label: "Flashcards", icon: Layers },
  { id: "exercises", label: "Exercícios", icon: PenTool },
  { id: "mindmap", label: "Mapa Mental", icon: Network },
];

const steps: { key: Step; label: string; icon: React.ElementType }[] = [
  { key: "upload", label: "Upload", icon: Upload },
  { key: "transcribing", label: "Transcrição", icon: Mic },
  { key: "review", label: "Revisão", icon: Edit3 },
  { key: "analyzed", label: "Análise IA", icon: Sparkles },
  { key: "done", label: "Materiais", icon: FileText },
];

function getStepIndex(step: Step): number {
  if (step === "analyzing") return 3;
  if (step === "generating") return 4;
  return steps.findIndex((s) => s.key === step);
}

export default function TranscriptionPage() {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [rawTranscription, setRawTranscription] = useState("");
  const [editedTranscription, setEditedTranscription] = useState("");
  const [analyzedText, setAnalyzedText] = useState("");
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>(["summary"]);
  const [generatedMaterials, setGeneratedMaterials] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const sendChunk = async (chunk: Blob, mimeType: string, idx?: number, total?: number): Promise<string> => {
    const fd = new FormData();
    fd.append("audio", new File([chunk], `chunk.mp3`, { type: mimeType }));
    if (idx !== undefined && total !== undefined) {
      fd.append("chunkIndex", String(idx));
      fd.append("totalChunks", String(total));
    }
    const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-audio`, {
      method: "POST",
      headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
      body: fd,
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || `Erro (${resp.status})`);
    }
    return (await resp.json()).transcription;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("audio/") && !f.name.match(/\.(mp3|wav|m4a)$/i)) {
      toast({ title: "Formato não suportado", description: "Use MP3, WAV ou M4A.", variant: "destructive" });
      return;
    }
    setFile(f);
    e.target.value = "";
  };

  const startTranscription = async () => {
    if (!file) return;
    setCurrentStep("transcribing");
    setProgress(0);
    
    try {
      setProgressLabel("Preparando áudio...");
      const chunks = await splitAudioRobustly(file, 300, 3, (msg) => {
        setProgressLabel(msg);
        setProgress(10); // Mantém progresso fixo em 10% durante preparação local
      });
      const totalChunks = chunks.length;

      if (totalChunks === 0) throw new Error("Áudio inválido ou vazio.");

      if (totalChunks === 1) {
        setProgressLabel("Transcrevendo áudio...");
        setProgress(30);
        const text = await sendChunk(chunks[0].blob, "audio/wav");
        setProgress(100);
        setRawTranscription(text);
        setEditedTranscription(text);
        setCurrentStep("review");
        toast({ title: "Transcrição concluída!" });
      } else {
        let full = "";
        for (const chunk of chunks) {
          setProgressLabel(`Transcrevendo parte ${chunk.index + 1} de ${totalChunks}...`);
          setProgress(10 + Math.round((chunk.index / totalChunks) * 90));
          const text = await sendChunk(chunk.blob, "audio/wav", chunk.index, totalChunks);
          full += (full ? "\n\n" : "") + text;
        }
        setProgress(100);
        setRawTranscription(full);
        setEditedTranscription(full);
        setCurrentStep("review");
        toast({ title: "Transcrição concluída!", description: `${totalChunks} partes processadas.` });
      }
    } catch (e: any) {
      toast({ title: "Erro na transcrição", description: e.message, variant: "destructive" });
      setCurrentStep("upload");
    }
  };

  const handleAnalyze = async () => {
    setCurrentStep("analyzing");
    try {
      const { data, error } = await supabase.functions.invoke("analyze-transcription", {
        body: { transcription: editedTranscription },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setAnalyzedText(data.result);
      setCurrentStep("analyzed");
      toast({ title: "Análise concluída!" });
    } catch (e: any) {
      toast({ title: "Erro na análise", description: e.message, variant: "destructive" });
      setCurrentStep("review");
    }
  };

  const toggleMaterial = (id: string) => {
    setSelectedMaterials((prev) => prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]);
  };

  const handleGenerateMaterials = async () => {
    if (selectedMaterials.length === 0) {
      toast({ title: "Selecione ao menos um material", variant: "destructive" });
      return;
    }
    setCurrentStep("generating");
    setIsGenerating(true);
    const results: Record<string, string> = {};
    const sourceText = analyzedText || editedTranscription;
    try {
      for (const type of selectedMaterials) {
        setProgressLabel(`Gerando ${materialOptions.find((m) => m.id === type)?.label}...`);
        const res = await generateMaterial(sourceText, type);
        results[type] = res;
        const typeLabel = materialOptions.find((m) => m.id === type)?.label || type;
        await supabase.from("generated_materials").insert({
          title: `${typeLabel} - Transcrição`,
          type, content: res, source_preview: sourceText.slice(0, 200),
          user_id: user?.id,
        });
      }
      setGeneratedMaterials(results);
      setCurrentStep("done");
      toast({ title: "Materiais gerados!" });
    } catch (e: any) {
      toast({ title: "Erro ao gerar materiais", description: e.message, variant: "destructive" });
      setCurrentStep("analyzed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPdf = (content: string, title: string) => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = resultRef.current?.innerHTML || content;
    downloadMarkdownAsPdf(title, tempDiv.innerHTML);
  };

  const resetFlow = () => {
    setCurrentStep("upload");
    setFile(null);
    setRawTranscription("");
    setEditedTranscription("");
    setAnalyzedText("");
    setGeneratedMaterials({});
    setProgress(0);
    setSelectedMaterials(["summary"]);
  };

  const currentStepIndex = getStepIndex(currentStep);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Transcrição de Áudio</h1>
        <p className="text-sm text-muted-foreground">Transcreva áudios longos com revisão assistida por IA</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-2 sm:p-3 overflow-x-auto">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1 flex-shrink-0">
            <div className={cn(
              "flex items-center gap-1.5 sm:gap-2 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-medium transition-colors",
              currentStepIndex >= i
                ? currentStepIndex === i ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                : "text-muted-foreground"
            )}>
              <s.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < steps.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />}
          </div>
        ))}
      </div>

      {/* Upload */}
      {currentStep === "upload" && (
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Upload className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground">Envie seu áudio</h2>
              <p className="mt-1 text-sm text-muted-foreground">Suporte para áudios de 1 a 2 horas (MP3, WAV, M4A)</p>
            </div>
            {!file ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/50 px-6 sm:px-8 py-5 sm:py-6 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
              >
                <Upload className="h-5 w-5" />
                Selecionar arquivo de áudio
              </button>
            ) : (
              <div className="flex flex-col items-center gap-3 w-full max-w-sm">
                <div className="flex items-center gap-3 rounded-lg bg-secondary px-4 py-3 w-full">
                  <Mic className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="text-left min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
                  </div>
                </div>
                <div className="flex gap-2 w-full">
                  <button onClick={() => setFile(null)}
                    className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm text-muted-foreground hover:bg-secondary">
                    Trocar
                  </button>
                  <button onClick={startTranscription}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                    <Mic className="h-4 w-4" /> Iniciar
                  </button>
                </div>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="audio/*,.mp3,.wav,.m4a" className="hidden" onChange={handleFileSelect} />
          </div>
        </div>
      )}

      {/* Transcribing */}
      {currentStep === "transcribing" && (
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground">Transcrevendo áudio...</h2>
              <p className="mt-1 text-sm text-muted-foreground">{progressLabel}</p>
            </div>
            <div className="w-full max-w-md">
              <Progress value={progress} className="h-2" />
              <p className="mt-2 text-xs text-muted-foreground">{progress}% concluído</p>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Pode levar alguns minutos
            </div>
          </div>
        </div>
      )}

      {/* Review */}
      {currentStep === "review" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-light flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-gold" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-foreground">Transcrição concluída — aguardando revisão</h2>
                <p className="text-xs text-muted-foreground">Revise e corrija o texto antes da análise por IA</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Edit3 className="h-4 w-4" />
                Editor de Transcrição
              </div>
              <span className="text-xs text-muted-foreground">{editedTranscription.length} chars</span>
            </div>
            <textarea
              value={editedTranscription}
              onChange={(e) => setEditedTranscription(e.target.value)}
              className="w-full min-h-[300px] sm:min-h-[400px] bg-transparent p-4 text-sm text-foreground outline-none resize-y placeholder:text-muted-foreground"
              placeholder="A transcrição aparecerá aqui..."
            />
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <button onClick={() => setEditedTranscription(rawTranscription)}
              className="text-xs text-muted-foreground hover:text-foreground underline">
              Restaurar original
            </button>
            <button onClick={handleAnalyze}
              className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98] transition-all w-full sm:w-auto justify-center">
              <Sparkles className="h-4 w-4" />
              Analisar Transcrição
            </button>
          </div>
        </div>
      )}

      {/* Analyzing */}
      {currentStep === "analyzing" && (
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground">Analisando transcrição...</h2>
              <p className="mt-1 text-sm text-muted-foreground">Corrigindo, organizando e identificando conceitos-chave</p>
            </div>
          </div>
        </div>
      )}

      {/* Analyzed */}
      {currentStep === "analyzed" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-foreground">Análise concluída</h2>
              <p className="text-xs text-muted-foreground">Revise o resultado e selecione os materiais</p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-sm font-medium text-foreground">Transcrição Analisada</span>
              <button onClick={() => handleDownloadPdf(analyzedText, "Transcrição Analisada")}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                <Download className="h-3.5 w-3.5" /> PDF
              </button>
            </div>
            <div ref={resultRef} className="max-h-[300px] sm:max-h-[400px] overflow-y-auto p-4 prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground">
              <ReactMarkdown>{analyzedText}</ReactMarkdown>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Selecione os materiais:</h3>
            <div className="grid grid-cols-2 gap-2">
              {materialOptions.map((m) => (
                <button key={m.id} onClick={() => toggleMaterial(m.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border p-3 text-sm transition-all",
                    selectedMaterials.includes(m.id)
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:bg-secondary"
                  )}>
                  <m.icon className="h-4 w-4" />
                  {m.label}
                </button>
              ))}
            </div>
            <button onClick={handleGenerateMaterials} disabled={selectedMaterials.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 active:scale-[0.98] transition-all">
              <Sparkles className="h-4 w-4" />
              Gerar {selectedMaterials.length} Material(is)
            </button>
          </div>
        </div>
      )}

      {/* Generating */}
      {currentStep === "generating" && (
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground">Gerando materiais...</h2>
              <p className="mt-1 text-sm text-muted-foreground">{progressLabel}</p>
            </div>
          </div>
        </div>
      )}

      {/* Done */}
      {currentStep === "done" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-foreground">Materiais prontos!</h2>
                <p className="text-xs text-muted-foreground">Todos os materiais foram gerados e salvos</p>
              </div>
            </div>
            <button onClick={resetFlow}
              className="rounded-lg border border-border px-4 py-2.5 text-sm text-muted-foreground hover:bg-secondary self-start">
              Nova transcrição
            </button>
          </div>

          {Object.entries(generatedMaterials).map(([type, content]) => {
            const label = materialOptions.find((m) => m.id === type)?.label || type;
            return (
              <div key={type} className="rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <span className="text-sm font-medium text-foreground">{label}</span>
                  <button onClick={() => handleDownloadPdf(content, label)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                    <Download className="h-3.5 w-3.5" /> PDF
                  </button>
                </div>
                <div className="max-h-[250px] sm:max-h-[300px] overflow-y-auto p-4 prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground">
                  <ReactMarkdown>{content}</ReactMarkdown>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
