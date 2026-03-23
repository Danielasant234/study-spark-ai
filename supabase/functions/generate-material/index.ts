import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { content, type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompts: Record<string, string> = {
      summary: `Crie um resumo estruturado e detalhado do seguinte conteúdo. Use títulos, subtítulos, bullet points e destaque conceitos-chave em negrito. O resumo deve ser completo mas conciso.\n\nConteúdo:\n${content}`,
      flashcards: `Gere pelo menos 10 flashcards (pergunta e resposta) a partir do seguinte conteúdo. Retorne em formato JSON como array de objetos com campos "front" (pergunta) e "back" (resposta). Apenas o JSON, sem texto adicional.\n\nConteúdo:\n${content}`,
      exercises: `Gere 10 exercícios variados (múltipla escolha, verdadeiro/falso e dissertativas) com gabarito completo a partir do seguinte conteúdo. Organize por tipo e inclua explicações nas respostas.\n\nConteúdo:\n${content}`,
      mindmap: `Crie um mapa mental em formato textual hierárquico do seguinte conteúdo. Use indentação com "─" para sub-tópicos e organize de forma lógica os conceitos principais e secundários.\n\nConteúdo:\n${content}`,
    };

    const systemPrompt = `Você é um assistente educacional especializado em criar materiais de estudo de alta qualidade. Responda sempre em português brasileiro com formatação markdown clara e organizada.`;

    const userPrompt = prompts[type] || prompts.summary;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro ao gerar material" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
