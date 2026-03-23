StudyAI - educational platform with AI integration, emerald green theme, Portuguese BR

- Design: emerald theme (primary: 158 64% 32%), Inter font, custom surface tokens
- Backend: Lovable Cloud (Supabase), no auth yet (public RLS policies)
- Edge functions: chat (streaming), generate-material, transcribe-audio
- Tables: conversations, generated_materials, flashcards (SM-2 fields), review_sessions
- AI model: google/gemini-3-flash-preview for chat/generation, gemini-2.5-flash for audio
- PDF export via browser print API (src/lib/pdf.ts)
- SM-2 spaced repetition algorithm in src/lib/sm2.ts
- Flashcards auto-parsed from AI-generated material in Generate page
- No authentication implemented yet - all data is public
