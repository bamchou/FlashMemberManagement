-- コーチのシフト表管理
-- Supabase の SQL Editor で実行してください。何度実行しても安全です。

-- 1) 練習ごとの「コーチ募集」フラグ
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS needs_coach boolean NOT NULL DEFAULT false;

-- 2) コーチの参加状態（available=参加可＝通常カレンダーに反映 / unavailable=参加不可）
--    行が無い＝未回答。既存の参加コーチは available 扱い。
ALTER TABLE public.event_coach_attendances
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'available';

-- CHECK 制約（無ければ付与）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'event_coach_attendances_status_check'
  ) THEN
    ALTER TABLE public.event_coach_attendances
      ADD CONSTRAINT event_coach_attendances_status_check
      CHECK (status IN ('available', 'unavailable'));
  END IF;
END $$;

-- (event_id, coach_id) の一意制約（無ければ付与。upsert/回答更新のため）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'event_coach_attendances_event_coach_key'
  ) THEN
    ALTER TABLE public.event_coach_attendances
      ADD CONSTRAINT event_coach_attendances_event_coach_key
      UNIQUE (event_id, coach_id);
  END IF;
END $$;
