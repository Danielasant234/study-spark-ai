# Memory: index.md
Updated: now

StudyAI - educational platform with AI integration, One Piece-inspired theme, Portuguese BR

- Design: Ocean blue primary (210 75% 35%), crimson accent (4 65% 52%), gold accent (42 78% 52%)
- Fonts: Plus Jakarta Sans (body), Space Grotesk (headings)
- Theme: White/clean base, subtle journey/navigation metaphors (One Piece inspired, no fanart)
- Custom tokens: --ocean, --crimson, --gold with light variants
- Card accents: left border colored lines (.card-accent-ocean, etc.)
- Backend: Lovable Cloud (Supabase), no auth yet (public RLS policies)
- Edge functions: chat (streaming), generate-material, transcribe-audio, analyze-transcription
- Tables: conversations, generated_materials, flashcards, review_sessions
- AI model: google/gemini-3-flash-preview for chat/generation, gemini-2.5-flash for audio
- PDF export via browser print API (src/lib/pdf.ts)
- No authentication implemented yet - all data is public
