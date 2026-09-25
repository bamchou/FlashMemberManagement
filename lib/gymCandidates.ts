import type { GymCandidate } from '@/lib/types'

export const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

/** 'YYYY-MM-DD' の曜日（0=日〜6=土）。タイムゾーンに依存しない */
export function weekdayOf(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/** 'HH:MM:SS' → 'H:MM' */
function shortTime(t: string | null): string {
  if (!t) return ''
  const [h, m] = t.split(':')
  return `${parseInt(h, 10)}:${m}`
}

/** 候補の表示用文字列（例: 託麻SC 6面 9:00〜12:00） */
export function formatCandidate(c: Pick<GymCandidate, 'gym_name' | 'courts' | 'start_time' | 'end_time'>): string {
  const parts = [c.gym_name]
  if (c.courts != null) parts.push(`${c.courts}面`)
  if (c.start_time || c.end_time) parts.push(`${shortTime(c.start_time)}〜${shortTime(c.end_time)}`)
  return parts.join(' ')
}
