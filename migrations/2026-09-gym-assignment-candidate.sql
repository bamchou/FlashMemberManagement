-- 体育館予約割当に「予約する体育館（候補）」を追加
-- Supabase の SQL Editor で実行してください。何度実行しても安全です。
-- 候補が削除された場合は未指定（NULL）に戻ります。

ALTER TABLE public.gym_reservation_assignments
  ADD COLUMN IF NOT EXISTS gym_candidate_id uuid REFERENCES public.gym_candidates(id) ON DELETE SET NULL;
