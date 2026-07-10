export type Role = 'admin' | 'coach' | 'member'

export type Profile = {
  id: string
  role: Role
  display_name: string | null
  username: string | null
  photo_url: string | null
  birth_date: string | null
  badminton_start_date: string | null
  show_on_members_page: boolean
  created_at: string
}

export type Member = {
  id: string
  full_name: string
  gender: '男' | '女' | null
  birth_date: string
  join_date: string
  badminton_start_date: string | null
  play_style: string | null
  photo_url: string | null
  created_at: string
  updated_at: string
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

export type CoachNote = {
  id: string
  title: string
  content: string
  created_by: string | null
  created_at: string
  updated_at: string
}
