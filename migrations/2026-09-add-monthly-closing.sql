-- 月次締め・経費管理・大会参加費の支払済み管理
-- Supabase の SQL Editor で実行してください。何度実行しても安全です。

-- 1) 大会参加費の支払済み管理
ALTER TABLE public.event_participants
  ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT false;

-- 2) 経費（シャトル・備品・大会費など）。領収書は Storage(attachments) に1ファイル保存
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date date NOT NULL,
  category text NOT NULL,
  amount integer NOT NULL CHECK (amount >= 0),
  memo text,
  receipt_path text,
  receipt_url text,
  receipt_name text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS expenses_expense_date_idx ON public.expenses (expense_date);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_all" ON public.expenses;
CREATE POLICY "authenticated_all" ON public.expenses
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3) 月次締め（締めた月の集計値を summary に記録。行がある月＝締め済み）
CREATE TABLE IF NOT EXISTS public.monthly_closings (
  year integer NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  summary jsonb NOT NULL,
  closed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  closed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (year, month)
);

ALTER TABLE public.monthly_closings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_all" ON public.monthly_closings;
CREATE POLICY "authenticated_all" ON public.monthly_closings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
