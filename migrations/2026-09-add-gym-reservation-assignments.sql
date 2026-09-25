-- 体育館予約の担当者割当（日付ごとに1人）
-- Supabase の SQL Editor で実行してください。何度実行しても安全です。

CREATE TABLE IF NOT EXISTS public.gym_reservation_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_date date NOT NULL UNIQUE,                                   -- 予約する日（練習日）
  assignee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- 予約担当者
  assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gym_reservation_assignments_assignee_idx
  ON public.gym_reservation_assignments (assignee_id, target_date);

ALTER TABLE public.gym_reservation_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_all" ON public.gym_reservation_assignments;
CREATE POLICY "authenticated_all" ON public.gym_reservation_assignments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
