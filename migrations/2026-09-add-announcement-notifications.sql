-- 連絡事項のプッシュ通知機能 追加マイグレーション
-- Supabase の SQL Editor で実行してください。

-- 1) announcements に通知用カラムを追加
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS notify_on_post boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_at timestamptz;

-- 2) 連絡事項の通知送信ログ（二重送信防止）
CREATE TABLE IF NOT EXISTS public.push_announcement_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.push_subscriptions(id) ON DELETE CASCADE,
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('posted', 'scheduled')),
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, announcement_id, kind)
);

ALTER TABLE public.push_announcement_log ENABLE ROW LEVEL SECURITY;

-- 既存ポリシーがあれば作り直す
DROP POLICY IF EXISTS "authenticated_all" ON public.push_announcement_log;
CREATE POLICY "authenticated_all" ON public.push_announcement_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
