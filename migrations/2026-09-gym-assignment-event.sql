-- 体育館予約割当から仮登録した練習予定を紐づける（同じ枠からの二重登録を防ぐ）
-- Supabase の SQL Editor で実行してください。何度実行しても安全です。
-- 練習予定が削除された場合は NULL に戻り、再び仮登録できます。

ALTER TABLE public.gym_reservation_assignments
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE SET NULL;
