import { useState, useRef, lazy, Suspense } from "react";
import { FileText, Layers, PenTool, Network, Loader2, Copy, Check, Upload, Download, Mic, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { useReveal } from "@/hooks/useReveal";
import { generateMaterial } from "@/lib/ai";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { downloadMarkdownAsPdf } from "@/lib/pdf";
import { extractTextFromPDF } from "@/lib/pdf-parser";
import { extractTextFromDocx, extractTextFromPptx } from "@/lib/doc-parser";
import { splitAudioRobustly } from "@/lib/audio-processor";
import { useQuery } from "@tanstack/react-query";
import type { MindMapData } from "@/components/MindMap";

const MindMap = lazy(() => import("@/components/MindMap"));

const materialTypes = [
  { id: "summary", label: "Resumo", icon: FileText, description: "Resumo estruturado com conceitos-chave" },
  { id: "flashcards", label: "Flashcards", icon: Layers, description: "Perguntas e respostas para revisão" },
  { id: "exercises", label: "Exercícios", icon: PenTool, description: "Exercícios variados com gabarito" },
  { id: "mindmap", label: "Mapa Mental", icon: Network, description: "Visualização interativa de conceitos" },
];

export default function GeneratePage() {
  const { user } = useAuth();

  const parseAndSaveFlashcards = async (raw: string) => {
    let cards: { front: string; back: string }[] = [];
    try {
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          cards = parsed.filter((c: any) => c.front && c.back).map((c: any) => ({ front: c.front, back: c.back }));
        }
      }
    } catch { /* fall through */ }

    if (cards.length === 0) {
      const lines = raw.split('\n');
      let currentQ = '';
      let currentA = '';
      for (const line of lines) {
        const trimmed = line.trim();
        const qMatch = trimmed.match(/^\*?\*?(?:Pergunta|P|Q|\d+[\.\)])\s*:?\*?\*?\s*(.+)/i);
        const aMatch = trimmed.match(/^\*?\*?(?:Resposta|R|A)\s*:?\*?\*?\s*(.+)/i);
        if (qMatch) {
          if (currentQ && currentA) cards.push({ front: currentQ, back: currentA });
          currentQ = qMatch[1].trim();
          currentA = '';
        } else if (aMatch) {
          currentA = aMatch[1].trim();
        }
      }
      if (currentQ && currentA) cards.push({ front: currentQ, back: currentA });
    }

    if (cards.length > 0) {
      const { error } = await supabase.from('flashcards').insert(cards.map(c => ({
        front: c.front, back: c.back, subject: selectedSubject, next_review: new Date().toISOString(), user_id: user?.id,
      })));
      if (error) {
        toast({ title: 'Erro ao salvar flashcards', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: `${cards.length} flashcards salvos!`, description: 'Disponíveis na página de Flashcards.' });
      }
    }
  };

  const [content, setContent] = useState("");
  const [selectedType, setSelectedType] = useState("summary");
  const [selectedSubject, setSelectedSubject] = useState("Geral");
  const [result, setResult] = useState("");
  const [mindMapData, setMindMapData] = useState<MindMapData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isReadingPdf, setIsReadingPdf] = useState(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("*").order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
  const headerRef = useReveal();
  const formRef = useReveal();
  const resultRef = useRef<HTMLDivElement>(null);

  const parseMindMapJson = (raw: string): MindMapData | null => {
    try {
      // Try to extract JSON from possible markdown code blocks
      const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\{[\s\S]*\})/);
      if (!jsonMatch) return null;
      const parsed = JSON.parse(jsonMatch[1].trim());
      if (parsed.nodes && Array.isArray(parsed.nodes) && parsed.edges && Array.isArray(parsed.edges)) {
        return parsed as MindMapData;
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleGenerate = async () => {
    if (!content.trim()) {
      toast({ title: "Conteúdo vazio", description: "Cole ou digite o conteúdo para gerar o material.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setResult("");
    setMindMapData(null);
    try {
      const res = await generateMaterial(content, selectedType);
      
      if (selectedType === "mindmap") {
        const mapData = parseMindMapJson(res);
        if (mapData) {
          setMindMapData(mapData);
          setResult(res);
        } else {
          // Fallback to markdown rendering
          setResult(res);
        }
      } else {
        setResult(res);
      }

      const typeLabel = materialTypes.find((t) => t.id === selectedType)?.label || selectedType;
      await supabase.from("generated_materials").insert({
        title: `${typeLabel} - ${content.slice(0, 50)}...`,
        type: selectedType,
        content: res,
        source_preview: content.slice(0, 200),
        user_id: user?.id,
        subject: selectedSubject,
      });
      if (selectedType === "flashcards") {
        await parseAndSaveFlashcards(res);
      }
      toast({ title: "Material gerado!", description: "Seu material de estudo está pronto e foi salvo." });
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

  const handleDownloadPdf = () => {
    if (!result) return;
    const typeLabel = materialTypes.find((t) => t.id === selectedType)?.label || "Material";
    const html = resultRef.current?.innerHTML || "";
    downloadMarkdownAsPdf(`${typeLabel} - StudyAI`, html);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      await handlePdfUpload(file);
    } else if (file.name.match(/\.docx?$/i) || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      await handleDocUpload(file, 'docx');
    } else if (file.name.match(/\.pptx?$/i) || file.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
      await handleDocUpload(file, 'pptx');
    } else if (file.type === "text/plain" || file.name.endsWith(".md") || file.name.endsWith(".txt")) {
      const text = await file.text();
      setContent(text);
      toast({ title: "Arquivo carregado", description: file.name });
    } else if (file.type.startsWith("audio/") || file.name.match(/\.(mp3|wav|m4a|ogg|webm|aac|flac)$/i)) {
      await handleAudioTranscription(file);
    } else {
      toast({
        title: "Formato não suportado",
        description: "Use arquivos PDF, Word (.docx), Slides (.pptx), .txt, .md ou áudio.",
        variant: "destructive",
      });
    }
    e.target.value = "";
  };

  const handlePdfUpload = async (file: File) => {
    setIsReadingPdf(true);
    setTranscriptionProgress("Processando arquivo PDF...");
    try {
      const text = await extractTextFromPDF(file);
      if (!text.trim()) {
        toast({ title: "PDF vazio ou ilegível", description: "Não foi possível extrair texto deste PDF.", variant: "destructive" });
        return;
      }
      setContent(text);
      toast({ title: "PDF carregado e lido!", description: "O texto foi extraído com sucesso." });
    } catch (e: any) {
      toast({ title: "Erro na leitura do PDF", description: e.message, variant: "destructive" });
    } finally {
      setIsReadingPdf(false);
      setTranscriptionProgress("");
    }
  };

  const handleDocUpload = async (file: File, type: 'docx' | 'pptx') => {
    setIsReadingPdf(true);
    const label = type === 'docx' ? 'Word' : 'Slides';
    setTranscriptionProgress(`Processando arquivo ${label}...`);
    try {
      const text = type === 'docx' ? await extractTextFromDocx(file) : await extractTextFromPptx(file);
      if (!text.trim()) {
        toast({ title: `${label} vazio ou ilegível`, variant: "destructive" });
        return;
      }
      setContent(text);
      toast({ title: `${label} carregado!` });
    } catch (e: any) {
      toast({ title: `Erro na leitura do ${label}`, description: e.message, variant: "destructive" });
    } finally {
      setIsReadingPdf(false);
      setTranscriptionProgress("");
    }
  };

  const sendAudioChunk = async (chunk: Blob, mimeType: string, chunkIndex?: number, totalChunks?: number): Promise<string> => {
    const formData = new FormData();
    formData.append("audio", new File([chunk], `chunk.mp3`, { type: mimeType }));
    if (chunkIndex !== undefined && totalChunks !== undefined) {
      formData.append("chunkIndex", String(chunkIndex));
      formData.append("totalChunks", String(totalChunks));
    }
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-audio`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
      body: formData,
    });
    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData.error || `Erro ao transcrever áudio (${resp.status})`);
    }
    return (await resp.json()).transcription;
  };

  const handleAudioTranscription = async (file: File) => {
    setIsTranscribing(true);
    setTranscriptionProgress("Preparando áudio...");
    try {
      const chunks = await splitAudioRobustly(file, 300, 3, (msg) => setTranscriptionProgress(msg));
      const totalChunks = chunks.length;
      if (totalChunks === 0) throw new Error("Áudio inválido ou vazio.");

      if (totalChunks === 1) {
        setTranscriptionProgress("Transcrevendo áudio...");
        const transcription = await sendAudioChunk(chunks[0].blob, "audio/wav");
        setContent(transcription);
        toast({ title: "Áudio transcrito!" });
      } else {
        toast({ title: "Áudio longo detectado", description: `Dividido em ${totalChunks} partes.` });
        let fullTranscription = "";
        for (const chunk of chunks) {
          setTranscriptionProgress(`Transcrevendo parte ${chunk.index + 1} de ${totalChunks}...`);
          const chunkTranscription = await sendAudioChunk(chunk.blob, "audio/wav", chunk.index, totalChunks);
          fullTranscription += (fullTranscription ? "\n\n" : "") + chunkTranscription;
          setContent(fullTranscription);
        }
        toast({ title: "Áudio transcrito!", description: `${totalChunks} partes processadas.` });
      }
    } catch (e: any) {
      toast({ title: "Erro na transcrição", description: e.message, variant: "destructive" });
    } finally {
      setIsTranscribing(false);
      setTranscriptionProgress("");
    }
  };

  return (
    <div className="space-y-6">
      <div ref={headerRef} className="reveal">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Gerar Materiais</h1>
        <p className="text-sm text-muted-foreground">Cole texto, envie áudio ou arquivo e a IA gera materiais de estudo</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center bg-card border border-border p-4 rounded-xl shadow-sm reveal" style={{ transitionDelay: "50ms" }}>
        <div className="w-full sm:w-auto flex-1 max-w-sm">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block ml-1">Matéria / Categoria</label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/30 transition-all cursor-pointer"
          >
            <option value="Geral">Geral</option>
            {subjects.map((s: any) => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div ref={formRef} className="reveal grid gap-6 lg:grid-cols-2" style={{ transitionDelay: "100ms" }}>
        {/* Input side */}
        <div className="space-y-4">
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
                <div className="min-w-0">
                  <p className="font-medium truncate">{type.label}</p>
                  <p className="text-xs opacity-70 hidden sm:block">{type.description}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Cole aqui o conteúdo da aula, texto, transcrição ou anotações..."
              rows={10}
              disabled={isTranscribing || isReadingPdf}
              className="w-full rounded-xl border border-border bg-card p-4 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none transition-shadow focus:shadow-md focus:border-primary/30 disabled:opacity-50"
            />
            {content && !isTranscribing && !isReadingPdf && (
              <button
                onClick={() => setContent("")}
                className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <div className="absolute bottom-3 right-3 flex gap-2">
              <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-secondary px-2.5 sm:px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                <Mic className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Áudio</span>
                <input type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm,.aac,.flac" className="hidden" onChange={handleFileUpload} />
              </label>
              <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-secondary px-2.5 sm:px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                <Upload className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Texto / PDF / Word / Slides</span>
                <input type="file" accept=".txt,.md,.pdf,.doc,.docx,.ppt,.pptx" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          </div>

          {(isTranscribing || isReadingPdf) && (
            <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm text-primary">
              <Loader2 className="h-4 w-4 animate-spin" />
              {transcriptionProgress || (isReadingPdf ? "Lendo PDF..." : "Transcrevendo áudio...")}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isLoading || isTranscribing || isReadingPdf || !content.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 disabled:opacity-50 active:scale-[0.98]"
          >
            {isLoading ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Gerando...</>
            ) : (
              <><FileText className="h-4 w-4" />Gerar {materialTypes.find((t) => t.id === selectedType)?.label}</>
            )}
          </button>
        </div>

        {/* Output side */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Resultado</h3>
            {result && (
              <div className="flex items-center gap-1">
                <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                  {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copiado!" : "Copiar"}
                </button>
                {selectedType !== "mindmap" && (
                  <button onClick={handleDownloadPdf} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                    <Download className="h-3.5 w-3.5" />PDF
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="max-h-[500px] sm:max-h-[600px] overflow-y-auto p-4">
            {mindMapData && selectedType === "mindmap" ? (
              <Suspense fallback={<div className="flex items-center justify-center h-48"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
                <MindMap data={mindMapData} />
              </Suspense>
            ) : result ? (
              <div ref={resultRef} className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground prose-code:text-primary">
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
