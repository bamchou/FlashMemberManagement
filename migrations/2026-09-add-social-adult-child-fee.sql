-- 親睦会の参加費を「大人」「子供」の2種類に対応させるマイグレーション
-- Supabase の SQL Editor で実行してください。何度実行しても安全です。

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS adult_fee integer,  -- 親睦会: 大人の参加費
  ADD COLUMN IF NOT EXISTS child_fee integer;  -- 親睦会: 子供の参加費

-- 既存の親睦会は単一の payment_amount を大人参加費として引き継ぐ
UPDATE public.events
SET adult_fee = payment_amount
WHERE event_type = 'social'
  AND payment_amount IS NOT NULL
  AND adult_fee IS NULL;
