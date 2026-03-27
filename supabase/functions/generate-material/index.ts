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

    // Validate input
    if (!content || typeof content !== "string" || content.trim().length < 10) {
      return new Response(JSON.stringify({ error: "Conteúdo muito curto ou inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validTypes = ["summary", "flashcards", "exercises", "mindmap"];
    const safeType = validTypes.includes(type) ? type : "summary";

    const prompts: Record<string, string> = {
      summary: `Crie um resumo estruturado e detalhado do seguinte conteúdo. Formate a resposta em Markdown. Use títulos (##), subtítulos (###), listas ordenadas e marcadores (bullet points). Destaque conceitos-chave e termos importantes em **negrito**. O resumo deve ser visualmente limpo, organizado para leitura rápida e conciso.\n\nConteúdo:\n${content}`,
      flashcards: `Gere flashcards (pergunta e resposta) sobre o conteúdo. Formate a resposta EXCLUSIVAMENTE em Markdown estruturado, seguindo estritamente este padrão visual exato para CADA flashcard:\n\n**Pergunta:** [Sua pergunta aqui]\n**Resposta:** [Sua resposta aqui]\n\n---\n\nNão numere as perguntas. Use exatamente "**Pergunta:**" e "**Resposta:**".\n\nConteúdo:\n${content}`,
      exercises: `Gere 10 exercícios variados (múltipla escolha, verdadeiro/falso e dissertativas) a partir do seguinte conteúdo. Use formatação Markdown. Apresente primeiro APENAS as questões. Para questões de múltipla escolha, use formato de lista (A), B), C), etc). No final, crie uma seção delimitada por "## Gabarito e Explicações" com as respostas corretas e explicações detalhadas.\n\nConteúdo:\n${content}`,
      mindmap: `Analise o seguinte conteúdo e gere um mapa mental em formato JSON estruturado.

RESPONDA EXCLUSIVAMENTE com JSON válido, sem markdown, sem explicações, sem texto antes ou depois.

O JSON deve ter exatamente este formato:
{
  "nodes": [
    {"id": "1", "label": "Tema Central", "level": 0},
    {"id": "2", "label": "Subtema 1", "level": 1},
    {"id": "3", "label": "Conceito 1.1", "level": 2}
  ],
  "edges": [
    {"source": "1", "target": "2"},
    {"source": "2", "target": "3"}
  ]
}

Regras:
- O nó com level 0 é o tema central (apenas 1)
- level 1 são os tópicos principais (3-6 nós)
- level 2 são subtópicos (2-4 por tópico principal)
- level 3 são detalhes (opcional, 1-3 por subtópico)
- Cada nó deve ter id único (string numérica)
- Cada edge conecta um nó pai a um nó filho
- Labels devem ser concisos (máx 5 palavras)

Conteúdo:\n${content}`,
    };

    const systemPrompt = safeType === "mindmap"
      ? "Você é um assistente especializado em análise de conteúdo e estruturação de conhecimento. Responda APENAS com JSON válido, sem markdown."
      : "Você é um assistente educacional especializado em criar materiais de estudo de alta qualidade. Responda sempre em português brasileiro com formatação markdown clara, rica e visualmente bem organizada.";

    const userPrompt = prompts[safeType];

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
