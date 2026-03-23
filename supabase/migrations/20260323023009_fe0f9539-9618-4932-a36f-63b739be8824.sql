
-- Flashcards table with SM-2 algorithm fields
CREATE TABLE public.flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  front text NOT NULL,
  back text NOT NULL,
  subject text NOT NULL DEFAULT 'Geral',
  theme text DEFAULT NULL,
  difficulty smallint NOT NULL DEFAULT 0,
  -- SM-2 fields
  ease_factor real NOT NULL DEFAULT 2.5,
  interval integer NOT NULL DEFAULT 0,
  repetitions integer NOT NULL DEFAULT 0,
  next_review timestamp with time zone NOT NULL DEFAULT now(),
  last_reviewed timestamp with time zone DEFAULT NULL,
  -- Stats
  times_correct integer NOT NULL DEFAULT 0,
  times_incorrect integer NOT NULL DEFAULT 0,
  total_time_ms bigint NOT NULL DEFAULT 0,
  -- Metadata
  source_material_id uuid REFERENCES public.generated_materials(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Review sessions table for statistics
CREATE TABLE public.review_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone DEFAULT NULL,
  mode text NOT NULL DEFAULT 'all',
  subject text DEFAULT NULL,
  total_cards integer NOT NULL DEFAULT 0,
  correct integer NOT NULL DEFAULT 0,
  incorrect integer NOT NULL DEFAULT 0,
  total_time_ms bigint NOT NULL DEFAULT 0,
  cards_reviewed jsonb NOT NULL DEFAULT '[]'::jsonb
);

-- RLS
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read flashcards" ON public.flashcards FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert flashcards" ON public.flashcards FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update flashcards" ON public.flashcards FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete flashcards" ON public.flashcards FOR DELETE TO public USING (true);

CREATE POLICY "Anyone can read sessions" ON public.review_sessions FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert sessions" ON public.review_sessions FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update sessions" ON public.review_sessions FOR UPDATE TO public USING (true);

-- Enable realtime for flashcards
ALTER PUBLICATION supabase_realtime ADD TABLE public.flashcards;
