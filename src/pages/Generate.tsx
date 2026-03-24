import { useState, useRef } from "react";
import { FileText, Layers, PenTool, Network, Loader2, Copy, Check, Upload, Download, Mic, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { useReveal } from "@/hooks/useReveal";
import { generateMaterial } from "@/lib/ai";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { downloadMarkdownAsPdf } from "@/lib/pdf";

const materialTypes = [
  { id: "summary", label: "Resumo", icon: FileText, description: "Resumo estruturado com conceitos-chave" },
  { id: "flashcards", label: "Flashcards", icon: Layers, description: "Perguntas e respostas para revisão" },
  { id: "exercises", label: "Exercícios", icon: PenTool, description: "Exercícios variados com gabarito" },
  { id: "mindmap", label: "Mapa Mental", icon: Network, description: "Organização hierárquica de conceitos" },
];

const MAX_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB per chunk para evitar timeout no Gateway/Edge Function

export default function GeneratePage() {
  const parseAndSaveFlashcards = async (raw: string, sourceContent: string) => {
    let cards: { front: string; back: string }[] = [];

    // Try JSON parse first (AI often returns pure JSON)
    try {
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          cards = parsed.filter((c: any) => c.front && c.back).map((c: any) => ({ front: c.front, back: c.back }));
        }
      }
    } catch { /* fall through to markdown parsing */ }

    // Fallback: parse markdown patterns
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
      const subject = sourceContent.slice(0, 30).replace(/[^a-zA-ZÀ-ÿ\s]/g, '').trim() || 'Geral';
      const { error } = await supabase.from('flashcards').insert(cards.map(c => ({
        front: c.front, back: c.back, subject, next_review: new Date().toISOString(),
      })));
      if (error) {
        console.error('Error saving flashcards:', error);
        toast({ title: 'Erro ao salvar flashcards', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: `${cards.length} flashcards salvos!`, description: 'Disponíveis na página de Flashcards.' });
      }
    }
  };

  const [content, setContent] = useState("");
  const [selectedType, setSelectedType] = useState("summary");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState("");
  const [copied, setCopied] = useState(false);
  const headerRef = useReveal();
  const formRef = useReveal();
  const resultRef = useRef<HTMLDivElement>(null);

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

      const typeLabel = materialTypes.find((t) => t.id === selectedType)?.label || selectedType;
      await supabase.from("generated_materials").insert({
        title: `${typeLabel} - ${content.slice(0, 50)}...`,
        type: selectedType,
        content: res,
        source_preview: content.slice(0, 200),
      });

      // If flashcards, parse and save to flashcards table
      if (selectedType === "flashcards") {
        await parseAndSaveFlashcards(res, content);
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

    if (file.type === "text/plain" || file.name.endsWith(".md") || file.name.endsWith(".txt")) {
      const text = await file.text();
      setContent(text);
      toast({ title: "Arquivo carregado", description: file.name });
    } else if (file.type.startsWith("audio/") || file.name.match(/\.(mp3|wav|m4a|ogg|webm|aac|flac)$/i)) {
      await handleAudioTranscription(file);
    } else {
      toast({
        title: "Formato não suportado",
        description: "Use arquivos .txt, .md ou áudio (mp3, wav, m4a, ogg).",
        variant: "destructive",
      });
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const sendAudioChunk = async (chunk: Blob, mimeType: string, chunkIndex?: number, totalChunks?: number): Promise<string> => {
    const formData = new FormData();
    formData.append("audio", new File([chunk], `chunk.${mimeType.includes("wav") ? "wav" : "mp3"}`, { type: mimeType }));
    if (chunkIndex !== undefined && totalChunks !== undefined) {
      formData.append("chunkIndex", String(chunkIndex));
      formData.append("totalChunks", String(totalChunks));
    }

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-audio`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: formData,
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData.error || `Erro ao transcrever áudio (${resp.status})`);
    }

    const data = await resp.json();
    return data.transcription;
  };

  const handleAudioTranscription = async (file: File) => {
    setIsTranscribing(true);
    const mimeType = file.type || "audio/mpeg";

    try {
      if (file.size <= MAX_CHUNK_SIZE) {
        // Small file - send directly
        setTranscriptionProgress("Transcrevendo áudio...");
        const transcription = await sendAudioChunk(file, mimeType);
        setContent(transcription);
        toast({ title: "Áudio transcrito!", description: "A transcrição foi adicionada ao campo de conteúdo." });
      } else {
        // Large file - split into chunks
        const totalChunks = Math.ceil(file.size / MAX_CHUNK_SIZE);
        toast({ title: "Áudio grande detectado", description: `Dividindo em ${totalChunks} partes para processamento.` });

        let fullTranscription = "";

        for (let i = 0; i < totalChunks; i++) {
          setTranscriptionProgress(`Transcrevendo parte ${i + 1} de ${totalChunks}...`);
          const start = i * MAX_CHUNK_SIZE;
          const end = Math.min(start + MAX_CHUNK_SIZE, file.size);
          const chunk = file.slice(start, end, mimeType);

          const chunkTranscription = await sendAudioChunk(chunk, mimeType, i, totalChunks);
          fullTranscription += (fullTranscription ? "\n\n" : "") + chunkTranscription;

          // Update content progressively
          setContent(fullTranscription);
        }

        toast({ title: "Áudio transcrito!", description: `${totalChunks} partes processadas com sucesso.` });
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
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Gerar Materiais</h1>
        <p className="text-sm text-muted-foreground">Cole texto, envie áudio ou arquivo e a IA gera materiais de estudo</p>
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
              disabled={isTranscribing}
              className="w-full rounded-xl border border-border bg-card p-4 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none transition-shadow focus:shadow-md focus:border-primary/30 disabled:opacity-50"
            />
            {content && !isTranscribing && (
              <button
                onClick={() => setContent("")}
                className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <div className="absolute bottom-3 right-3 flex gap-2">
              <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                <Mic className="h-3.5 w-3.5" />
                Áudio
                <input type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm,.aac,.flac" className="hidden" onChange={handleFileUpload} />
              </label>
              <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                <Upload className="h-3.5 w-3.5" />
                Texto
                <input type="file" accept=".txt,.md" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          </div>

          {isTranscribing && (
            <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm text-primary">
              <Loader2 className="h-4 w-4 animate-spin" />
              {transcriptionProgress || "Transcrevendo áudio..."}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isLoading || isTranscribing || !content.trim()}
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
              <div className="flex items-center gap-1">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copiado!" : "Copiar"}
                </button>
                <button
                  onClick={handleDownloadPdf}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <Download className="h-3.5 w-3.5" />
                  PDF
                </button>
              </div>
            )}
          </div>
          <div className="max-h-[500px] overflow-y-auto p-4">
            {result ? (
              <div
                ref={resultRef}
                className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground prose-code:text-primary"
              >
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
