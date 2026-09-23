-- 練習の「参加要請」をデフォルトONにする（既存の練習にも反映）
-- Supabase の SQL Editor で実行してください。何度実行しても安全です。
-- 新規練習は作成時にアプリ側でONになります。

UPDATE public.events
SET needs_coach = true
WHERE event_type = 'practice'
  AND needs_coach = false;
