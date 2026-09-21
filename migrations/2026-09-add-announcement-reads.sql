-- お知らせの既読管理（未確認バッジ用）
-- Supabase の SQL Editor で実行してください。何度実行しても安全です。

CREATE TABLE IF NOT EXISTS public.announcement_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, user_id)
);

ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all" ON public.announcement_reads;
CREATE POLICY "authenticated_all" ON public.announcement_reads
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
