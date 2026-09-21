-- お知らせに「申し込み期限日」を追加（この日を過ぎるとコメント投稿不可）
-- Supabase の SQL Editor で実行してください。何度実行しても安全です。

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS entry_deadline date;
