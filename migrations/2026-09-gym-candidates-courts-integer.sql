-- 体育館予約候補の面数を数値（整数）に変更
-- Supabase の SQL Editor で実行してください。何度実行しても安全です。
-- ・「中体育室3面」→ 体育館名の後ろに「中体育室」を付け、面数は 3
-- ・「全面」→ 面数は空欄（画面から数値を入力してください）
-- ・「6面」など → 6

UPDATE public.gym_candidates
  SET gym_name = gym_name || ' 中体育室', courts = '3'
  WHERE courts::text = '中体育室3面';

UPDATE public.gym_candidates
  SET courts = NULL
  WHERE courts::text = '全面';

ALTER TABLE public.gym_candidates
  ALTER COLUMN courts TYPE integer
  USING NULLIF(regexp_replace(courts::text, '[^0-9]', '', 'g'), '')::integer;
