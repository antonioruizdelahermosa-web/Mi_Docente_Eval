
CREATE TABLE public.teacher_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  center_name TEXT NOT NULL DEFAULT 'CEIP Calatrava',
  level TEXT NOT NULL DEFAULT '',
  course TEXT NOT NULL DEFAULT '',
  school_year TEXT NOT NULL DEFAULT '2025-2026',
  areas JSONB NOT NULL DEFAULT '[{"id":"lengua","name":"Lengua"},{"id":"matematicas","name":"Matemáticas"},{"id":"cmedio","name":"C. del Medio"},{"id":"plastica","name":"Plástica"},{"id":"ingles","name":"Inglés"},{"id":"ef","name":"Ed. Física"}]'::jsonb,
  students JSONB NOT NULL DEFAULT '[]'::jsonb,
  custom_comments JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.teacher_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own data"
  ON public.teacher_data FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own data"
  ON public.teacher_data FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own data"
  ON public.teacher_data FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
