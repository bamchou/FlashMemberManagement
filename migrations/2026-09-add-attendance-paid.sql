-- 親睦会・イベントの人数登録に「支払済み」状態を追加
-- Supabase の SQL Editor で実行してください。何度実行しても安全です。

ALTER TABLE public.event_attendances
  ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT false;
