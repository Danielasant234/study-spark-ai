# Project Memory

## Core
StudyAI - educational platform with AI integration, ocean/adventure theme, Portuguese BR
Design: ocean blue primary, crimson accent, gold accent. Space Grotesk headings, Plus Jakarta Sans body
Backend: Lovable Cloud (Supabase), auth with auto-confirm email
All tables have user_id with RLS scoped to auth.uid()

## Memories
- Tables: profiles, conversations, flashcards, generated_materials, review_sessions, subjects
- Edge functions: chat (streaming), generate-material (with mindmap JSON), transcribe-audio, analyze-transcription
- AI model: google/gemini-3-flash-preview for chat/generation, gemini-2.5-flash for audio
- Mind maps: React Flow + dagre for visualization, JSON format from AI
- Security: DOMPurify sanitization, Zod validation schemas in src/lib/sanitize.ts
- generated_materials has subject column (text, default 'Geral')
- subjects table: id, name, color, user_id (properly typed in auto-generated types)
- Dashboard AI tip: uses local tips array (not streaming chat endpoint)
- Trigger on_auth_user_created exists for auto-creating profiles
