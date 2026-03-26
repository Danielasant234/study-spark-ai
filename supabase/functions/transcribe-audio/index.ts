import { serve } from "https://deno.land/std@0.168.0/http/server.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;
    if (!audioFile) {
      return new Response(JSON.stringify({ error: "Nenhum arquivo de áudio enviado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if this is a chunk or full file
    const chunkIndex = formData.get("chunkIndex");
    const totalChunks = formData.get("totalChunks");
    const isChunked = chunkIndex !== null && totalChunks !== null;

    // Use efficient base64 encoding (no string concatenation)
    const arrayBuffer = await audioFile.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < uint8.length; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    const base64Audio = btoa(binary);

    const mimeType = audioFile.type || "audio/mpeg";

    const isLastChunk = isChunked && Number(chunkIndex) === Number(totalChunks) - 1;

    const systemPrompt = isChunked && !isLastChunk
      ? `Você é um transcritor profissional especializado em reedição textual. Transcreva o áudio com extrema precisão em português brasileiro.
Este é o trecho ${Number(chunkIndex) + 1} de ${totalChunks} de um áudio contínuo.
1. Transcreva APENAS o conteúdo deste trecho.
2. Organize cuidadosamente o texto em parágrafos bem estruturados.
3. Corrija a pontuação e a gramática para melhorar a legibilidade, garantindo que o significado e a fluidez originais NÃO sejam alterados.
4. Caso haja múltiplos falantes, sinalize como "Falante 1:", "Falante 2:", etc.
5. Em hipótese alguma insira sumários, considerações finais ou formatações extras ao final deste trecho (apenas a transcrição contínua).`
      : `Você é um transcritor profissional especializado em reedição textual. Transcreva o áudio com extrema precisão em português brasileiro.
${isChunked ? `Este é o ÚLTIMO trecho (${Number(chunkIndex) + 1} de ${totalChunks}) rotineiramente transcrito de um áudio contínuo.` : `Transcreva este arquivo de áudio completamente.`}
1. Organize cuidadosamente o texto em parágrafos bem estruturados.
2. Corrija a pontuação e a gramática para melhorar a legibilidade, garantindo que o significado original NÃO seja alterado.
3. Caso haja múltiplos falantes, sinalize como "Falante 1:", "Falante 2:", etc.
4. Ao final da transcrição, adicione uma seção obrigatória "## Tópicos Principais", destacando os temas centrais abordados.
5. Liste em "## Resumo" uma rápida síntese do áudio e em "## Conceitos-chave" as palavras mais densas abordadas.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "input_audio",
                input_audio: {
                  data: base64Audio,
                  format: mimeType.includes("wav") ? "wav" : "mp3",
                },
              },
              {
                type: "text",
                text: isChunked
                  ? `Transcreva este trecho ${Number(chunkIndex) + 1} de ${totalChunks} do áudio.`
                  : "Transcreva este áudio de forma completa e organizada.",
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro ao transcrever áudio" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const transcription = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ transcription }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("transcribe error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
