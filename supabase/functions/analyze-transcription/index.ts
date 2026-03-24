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

    const { transcription } = await req.json();
    if (!transcription?.trim()) {
      return new Response(JSON.stringify({ error: "Transcrição vazia" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Você é um revisor profissional de transcrições acadêmicas em português brasileiro.

Sua tarefa é analisar e melhorar a transcrição fornecida. Você deve:

1. **Corrigir gramática e coerência** — corrija erros gramaticais, concordância, e melhore a fluidez do texto sem alterar o significado.
2. **Organizar em parágrafos lógicos** — divida o texto em parágrafos bem estruturados.
3. **Criar títulos de seções** — identifique mudanças de tópico e crie títulos descritivos usando ## para cada seção.
4. **Identificar e destacar conceitos-chave** — coloque termos importantes em **negrito**.
5. **Ao final, adicione uma seção "## Conceitos-chave"** listando os principais termos e conceitos mencionados.
6. **Adicione "## Resumo Geral"** com um resumo de 3-5 parágrafos do conteúdo completo.

Mantenha TODO o conteúdo original — não remova informações. Apenas reorganize, corrija e melhore.
Responda APENAS com o texto revisado em Markdown.`;

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
          { role: "user", content: `Revise e melhore esta transcrição:\n\n${transcription}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
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
      return new Response(JSON.stringify({ error: "Erro ao analisar transcrição" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
