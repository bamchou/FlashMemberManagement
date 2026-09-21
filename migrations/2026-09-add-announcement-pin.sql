-- お知らせのピン止め機能
-- Supabase の SQL Editor で実行してください。何度実行しても安全です。

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;
