import DOMPurify from "dompurify";
import { z } from "zod";

// Sanitize HTML content
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "h1", "h2", "h3", "h4", "h5", "h6", "p", "br", "ul", "ol", "li",
      "strong", "em", "code", "pre", "blockquote", "a", "table", "thead",
      "tbody", "tr", "th", "td", "hr", "span", "div",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "class"],
  });
}

// Sanitize plain text (strip all HTML)
export function sanitizeText(text: string): string {
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
}

// Validation schemas
export const contentSchema = z.object({
  content: z.string().trim().min(10, "Conteúdo muito curto (mínimo 10 caracteres)").max(100000, "Conteúdo muito longo"),
  type: z.enum(["summary", "flashcards", "exercises", "mindmap"]),
});

export const audioFileSchema = z.object({
  name: z.string(),
  size: z.number().max(500 * 1024 * 1024, "Arquivo muito grande (máx 500MB)"),
  type: z.string().refine(
    (t) => t.startsWith("audio/") || ["application/octet-stream"].includes(t),
    "Formato de áudio inválido"
  ),
});

export const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(10000),
});

export const subjectSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório").max(100, "Nome muito longo"),
  color: z.string().regex(/^hsl\(\d+,\s*\d+%?,\s*\d+%?\)$/, "Cor inválida"),
});
