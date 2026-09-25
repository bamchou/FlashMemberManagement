export type Role = 'admin' | 'coach' | 'member'

export type Profile = {
  id: string
  role: Role
  display_name: string | null
  display_name_kana: string | null
  username: string | null
  photo_url: string | null
  birth_date: string | null
  badminton_start_date: string | null
  show_on_members_page: boolean
  qualifications: string | null
  gym_account_count: number  // 体育館予約アカウントの保有数
  created_at: string
}

export type Member = {
  id: string
  full_name: string
  full_name_kana: string | null
  gender: '男' | '女' | null
  birth_date: string
  join_date: string
  badminton_start_date: string | null
  play_style: string | null
  photo_url: string | null
  registration_number: string | null
  is_visible: boolean
  guardian_id: string | null
  approval_status: 'pending' | 'approved' | 'rejected'
  practice_frequency: number | null
  practice_days: string[] | null
  withdrawn_at: string | null
  created_at: string
  updated_at: string
}

export type PracticeFeeSetting = {
  frequency: number
  monthly_fee: number
}

export type ParticipationCategory = 'singles' | 'doubles' | 'both'

export type EventParticipant = {
  id: string
  event_id: string
  member_id: string
  registered_by: string | null
  approval_status: 'approved' | 'pending'
  participation_category: ParticipationCategory | null
  fee_snapshot: number | null
  created_at: string
  members?: { full_name: string; photo_url: string | null } | null
}

export type TournamentResult = {
  id: string
  member_id: string
  tournament_name: string
  tournament_date: string
  event_type: string
  result: string | null
  advanced_to_prefectural: boolean
  advanced_to_kyushu: boolean
  created_at: string
}

export type PrefecturalReinforcement = {
  id: string
  member_id: string
  selected_date: string
  notes: string | null
  created_at: string
}

export type Announcement = {
  id: string
  seq: number
  title: string
  content: string
  target: 'all' | 'coach' | 'member'
  announcement_type: 'normal' | 'always'
  is_pinned: boolean
  publish_start: string | null
  publish_end: string | null
  entry_deadline: string | null
  notify_on_post: boolean
  notify_at: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export type AnnouncementComment = {
  id: string
  announcement_id: string
  user_id: string
  content: string
  is_visible: boolean
  created_at: string
  updated_at: string
  profiles?: { display_name: string | null; username: string | null }
}

export type EventComment = {
  id: string
  event_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
  profiles?: { display_name: string | null; username: string | null }
}

export type EventAttendance = {
  id: string
  event_id: string
  user_id: string
  adult_count: number
  child_count: number
  is_paid: boolean
  created_at: string
  updated_at: string
}

export type GymCandidate = {
  id: string
  weekday: number        // 0=日 … 6=土
  priority: number       // 1〜4（第○候補）
  gym_name: string
  courts: number | null  // 面数
  start_time: string | null  // 'HH:MM:SS'
  end_time: string | null
  updated_at: string
}

export type GymReservationAssignment = {
  id: string
  target_date: string   // YYYY-MM-DD
  slot: number          // 1〜3（1日最大3人）
  assignee_id: string
  gym_candidate_id: string | null  // 予約する体育館（候補）
  event_id: string | null          // この枠から仮登録した練習
  assigned_by: string | null
  created_at: string
  updated_at: string
}

export type EventType = 'practice' | 'tournament' | 'event' | 'social' | 'other'

export type CalendarEvent = {
  id: string
  title: string
  description: string | null
  event_type: EventType
  target: 'all' | 'coach' | 'member'
  start_at: string
  end_at: string
  status: 'provisional' | 'confirmed'
  is_visible: boolean
  is_all_day: boolean
  payment_method: string | null
  payment_amount: number | null
  payment_status: 'unpaid' | 'paid'
  venue: string | null
  singles_fee: number | null
  doubles_fee: number | null
  adult_fee: number | null
  child_fee: number | null
  accompaniment_type: string | null
  accompaniment_fee_per_person: number | null
  entry_deadline: string | null
  is_game_practice: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export type AccompanimentFeeSetting = {
  id: string
  area_type: string
  label: string
  amount_per_person: number
  created_at: string
  updated_at: string
}

export type Attachment = {
  id: string
  entity_type: 'event' | 'announcement'
  entity_id: string
  file_name: string
  storage_path: string
  file_url: string
  file_size: number | null
  created_by: string | null
  created_at: string
}

export type CoachNote = {
  id: string
  title: string
  content: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export type BibStatus = 'requested' | 'ordered' | 'delivered'

export type BibRequest = {
  id: string
  member_id: string
  requested_by: string | null
  status: BibStatus
  requested_at: string
  ordered_at: string | null
  delivered_at: string | null
}
