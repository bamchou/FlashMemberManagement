-- お知らせ種別カラムの追加マイグレーション
-- Supabase の SQL Editor で実行してください。
-- normal = 通常お知らせ / always = 常時お知らせ

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS announcement_type text NOT NULL DEFAULT 'normal'
  CHECK (announcement_type IN ('normal', 'always'));
