-- 通常イベント(event)の参加費も大人・子供の2種類に対応させる移行。
-- adult_fee/child_fee カラムは既存（social対応時に追加済み）。
-- Supabase の SQL Editor で実行してください。何度実行しても安全です。

-- 既存イベントの単一 payment_amount を大人参加費として引き継ぐ
UPDATE public.events
SET adult_fee = payment_amount
WHERE event_type = 'event'
  AND payment_amount IS NOT NULL
  AND adult_fee IS NULL;
