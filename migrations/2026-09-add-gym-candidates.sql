-- 体育館の予約候補（曜日ごとに第1〜第4候補）
-- Supabase の SQL Editor で実行してください。何度実行しても安全です（初期データは未登録の分だけ入ります）。
-- weekday: 0=日 1=月 2=火 3=水 4=木 5=金 6=土 / priority: 1〜4（第○候補）

CREATE TABLE IF NOT EXISTS public.gym_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weekday integer NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  priority integer NOT NULL CHECK (priority BETWEEN 1 AND 4),
  gym_name text NOT NULL,
  courts text,          -- 面数（例: 6面 / 全面 / 中体育室3面）
  start_time time,      -- 予約開始時刻
  end_time time,        -- 予約終了時刻
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (weekday, priority)
);

ALTER TABLE public.gym_candidates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_all" ON public.gym_candidates;
CREATE POLICY "authenticated_all" ON public.gym_candidates
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 初期データ（時刻は未設定。画面から入力してください）
INSERT INTO public.gym_candidates (weekday, priority, gym_name, courts) VALUES
  (0, 1, '熊本市立体育館', '中体育室3面'),
  (0, 2, '託麻SC', '6面'),
  (0, 3, '浜線健康パーク', '6面'),
  (0, 4, '城南SC', '6面'),
  (1, 1, '秋津小', '全面'),
  (1, 2, '東部中', '全面'),
  (1, 3, '熊本市立体育館', '中体育室3面'),
  (1, 4, '東部交流センター', '全面'),
  (3, 1, '秋津小', '全面'),
  (3, 2, '東部中', '全面'),
  (3, 3, '熊本市立体育館', '中体育室3面'),
  (3, 4, '浜線健康パーク', '3面'),
  (4, 1, '西原中', '全面'),
  (4, 2, '東部中', '全面'),
  (4, 3, '熊本市立体育館', '中体育室3面'),
  (4, 4, '浜線健康パーク', '3面')
ON CONFLICT (weekday, priority) DO NOTHING;
