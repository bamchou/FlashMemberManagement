-- =============================================
-- FLASH Member Management System - Schema
-- =============================================

-- profiles（auth.users と 1:1 で連動）
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  display_name text,
  display_name_kana text,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'coach', 'member')),
  photo_url text,
  birth_date date,
  badminton_start_date date,
  show_on_members_page boolean NOT NULL DEFAULT false,
  qualifications text,
  temp_password text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ユーザー登録時に profiles を自動生成するトリガー
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- username から email を引く RPC（ログイン用、未認証で呼び出し可能）
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT au.email INTO v_email
  FROM auth.users au
  JOIN public.profiles p ON p.id = au.id
  WHERE p.username = p_username;
  RETURN v_email;
END;
$$;

-- members
CREATE TABLE public.members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  full_name_kana text,
  gender text CHECK (gender IN ('男', '女')),
  birth_date date NOT NULL,
  join_date date NOT NULL,
  badminton_start_date date,
  play_style text,
  photo_url text,
  registration_number text,
  is_visible boolean NOT NULL DEFAULT true,
  guardian_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approval_status text NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  practice_frequency integer,
  practice_days text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- events
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_type text NOT NULL CHECK (event_type IN ('practice', 'tournament', 'event', 'social', 'other')),
  target text NOT NULL DEFAULT 'all' CHECK (target IN ('all', 'coach', 'member')),
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('provisional', 'confirmed')),
  is_visible boolean NOT NULL DEFAULT true,
  is_all_day boolean NOT NULL DEFAULT false,
  payment_method text,
  payment_amount integer,
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
  venue text,
  singles_fee integer,
  doubles_fee integer,
  accompaniment_type text,
  accompaniment_fee_per_person integer,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- event_participants
CREATE TABLE public.event_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  registered_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approval_status text NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('approved', 'pending')),
  participation_category text CHECK (participation_category IN ('singles', 'doubles', 'both')),
  fee_snapshot integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, member_id)
);

-- tournament_results
CREATE TABLE public.tournament_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  tournament_name text NOT NULL,
  tournament_date date NOT NULL,
  event_type text NOT NULL,
  result text,
  advanced_to_prefectural boolean NOT NULL DEFAULT false,
  advanced_to_kyushu boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- prefectural_reinforcements
CREATE TABLE public.prefectural_reinforcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  selected_date date NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- announcements
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  target text NOT NULL DEFAULT 'all' CHECK (target IN ('all', 'coach', 'member')),
  publish_start timestamptz,
  publish_end timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- announcement_comments
CREATE TABLE public.announcement_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- coach_notes
CREATE TABLE public.coach_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- push_subscriptions
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth_key text NOT NULL,
  hours_before integer NOT NULL DEFAULT 24,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (endpoint, user_id)
);

-- push_notification_log
CREATE TABLE public.push_notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.push_subscriptions(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, event_id)
);

-- event_comments
CREATE TABLE public.event_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- bib_requests
CREATE TABLE public.bib_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  requested_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'ordered', 'delivered')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  ordered_at timestamptz,
  delivered_at timestamptz,
  UNIQUE (member_id)
);

-- accompaniment_fee_settings
CREATE TABLE public.accompaniment_fee_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_type text NOT NULL UNIQUE,
  label text NOT NULL,
  amount_per_person integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- practice_fee_settings
CREATE TABLE public.practice_fee_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  frequency integer NOT NULL UNIQUE,
  monthly_fee integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- RLS（Row Level Security）
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prefectural_reinforcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bib_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accompaniment_fee_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_fee_settings ENABLE ROW LEVEL SECURITY;

-- ログイン済みユーザーは全テーブルを読み書き可能（アクセス制御はアプリ側で実施）
CREATE POLICY "authenticated_all" ON public.profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.members FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.events FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.event_participants FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.tournament_results FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.prefectural_reinforcements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.announcements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.announcement_comments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.coach_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.push_subscriptions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.push_notification_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.event_comments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.bib_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.accompaniment_fee_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.practice_fee_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
