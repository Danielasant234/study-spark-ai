StudyAI - educational platform with AI integration, emerald/ocean theme, Portuguese BR

- Design: ocean blue primary, crimson accent, gold accent. Space Grotesk headings, Plus Jakarta Sans body
- Backend: Lovable Cloud (Supabase), auth enabled with auto-confirm email
- Auth: email/password, profiles table with display_name/avatar_url, trigger on signup
- All tables have user_id column with RLS scoped to auth.uid()
- Storage: avatars bucket (public read, user-scoped write)
- Edge functions: chat (streaming), generate-material, transcribe-audio, analyze-transcription
- Tables: profiles, conversations, flashcards, generated_materials, review_sessions
- AI model: google/gemini-3-flash-preview for chat/generation, gemini-2.5-flash for audio
- PDF export via browser print API (src/lib/pdf.ts)
- Auth context: src/contexts/AuthContext.tsx
