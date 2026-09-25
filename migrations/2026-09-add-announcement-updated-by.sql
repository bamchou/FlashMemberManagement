-- お知らせの最終更新者を記録する（編集して保存した人）
-- Supabase の SQL Editor で実行してください。何度実行しても安全です。

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
