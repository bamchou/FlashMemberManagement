-- 体育館予約アカウント数（ユーザーごと）と、1日最大3人の予約担当割当
-- Supabase の SQL Editor で実行してください。何度実行しても安全です。

-- ユーザーが保持している体育館予約アカウントの数（0 = 持っていない）
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gym_account_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_gym_account_count_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_gym_account_count_check CHECK (gym_account_count BETWEEN 0 AND 10);

-- 割当を「日付＋枠（1〜3）」単位に変更（同じ人が複数枠に入れる）
ALTER TABLE public.gym_reservation_assignments
  ADD COLUMN IF NOT EXISTS slot integer NOT NULL DEFAULT 1;
ALTER TABLE public.gym_reservation_assignments DROP CONSTRAINT IF EXISTS gym_reservation_assignments_slot_check;
ALTER TABLE public.gym_reservation_assignments
  ADD CONSTRAINT gym_reservation_assignments_slot_check CHECK (slot BETWEEN 1 AND 3);
ALTER TABLE public.gym_reservation_assignments DROP CONSTRAINT IF EXISTS gym_reservation_assignments_target_date_key;
CREATE UNIQUE INDEX IF NOT EXISTS gym_reservation_assignments_date_slot_key
  ON public.gym_reservation_assignments (target_date, slot);
