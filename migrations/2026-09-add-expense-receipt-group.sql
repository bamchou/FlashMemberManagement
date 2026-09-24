-- 経費：1枚の領収書に複数の明細を登録できるようにする
-- 同じ領収書で登録した明細は receipt_group_id が共通になる（既存の行は NULL＝1明細1領収書）
-- Supabase の SQL Editor で実行してください。何度実行しても安全です。

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS receipt_group_id uuid;

CREATE INDEX IF NOT EXISTS expenses_receipt_group_id_idx ON public.expenses (receipt_group_id);
