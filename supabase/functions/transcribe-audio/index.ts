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

    const systemPrompt = isChunked
      ? `Você é um transcritor profissional. Transcreva o áudio com precisão total em português brasileiro.
Este é o trecho ${Number(chunkIndex) + 1} de ${totalChunks} de um áudio longo.
Transcreva APENAS o conteúdo deste trecho. Organize em parágrafos lógicos.
Se houver múltiplos falantes, indique com "Falante 1:", "Falante 2:", etc.
NÃO adicione resumo ou conceitos-chave neste trecho.`
      : `Você é um transcritor profissional. Transcreva o áudio com precisão total em português brasileiro. 
Organize a transcrição em parágrafos lógicos. Se houver múltiplos falantes, indique com "Falante 1:", "Falante 2:", etc.
Ao final, adicione uma seção "## Resumo" com os pontos principais do áudio.
Ao final do resumo, adicione "## Conceitos-chave" listando os conceitos mais importantes mencionados.`;

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
