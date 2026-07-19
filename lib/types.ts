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
  title: string
  content: string
  target: 'all' | 'coach' | 'member'
  publish_start: string | null
  publish_end: string | null
  created_by: string | null
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
