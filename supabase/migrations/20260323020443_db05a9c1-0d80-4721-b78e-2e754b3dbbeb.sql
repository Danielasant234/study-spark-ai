
-- Conversations table for chat history
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Nova conversa',
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read conversations" ON public.conversations FOR SELECT USING (true);
CREATE POLICY "Anyone can insert conversations" ON public.conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update conversations" ON public.conversations FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete conversations" ON public.conversations FOR DELETE USING (true);

-- Generated materials table
CREATE TABLE public.generated_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL DEFAULT 'summary',
  content text NOT NULL,
  source_preview text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read materials" ON public.generated_materials FOR SELECT USING (true);
CREATE POLICY "Anyone can insert materials" ON public.generated_materials FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete materials" ON public.generated_materials FOR DELETE USING (true);
