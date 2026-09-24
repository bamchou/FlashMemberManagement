import { createAdminClient } from '@/lib/supabase/admin'

export const CLOSED_MONTH_ERROR = 'この月は締め済みのため変更できません（月次締めを解除してください）'

/** JST 基準の月の範囲（UTC ISO）。start 以上 end 未満 */
export function monthBoundsJST(year: number, month: number): { start: string; end: string } {
  const pad = (n: number) => String(n).padStart(2, '0')
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 }
  return {
    start: new Date(`${year}-${pad(month)}-01T00:00:00+09:00`).toISOString(),
    end: new Date(`${next.y}-${pad(next.m)}-01T00:00:00+09:00`).toISOString(),
  }
}

/** UTC ISO（またはYYYY-MM-DD）から JST の年・月を得る */
export function jstYearMonth(isoOrDate: string): { year: number; month: number } {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(isoOrDate)
    ? new Date(`${isoOrDate}T00:00:00+09:00`)
    : new Date(isoOrDate)
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  return { year: jst.getUTCFullYear(), month: jst.getUTCMonth() + 1 }
}

export async function isMonthClosed(year: number, month: number): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('monthly_closings')
    .select('year')
    .eq('year', year)
    .eq('month', month)
    .maybeSingle()
  return !!data
}

/** 締め済みならエラーメッセージ、未締めなら null */
export async function closedMonthError(year: number, month: number): Promise<string | null> {
  return (await isMonthClosed(year, month)) ? CLOSED_MONTH_ERROR : null
}

/** イベント開催日の月が締め済みならエラーメッセージ */
export async function closedMonthErrorForEvent(eventId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data: ev } = await admin.from('events').select('start_at').eq('id', eventId).single()
  if (!ev) return null
  const { year, month } = jstYearMonth(ev.start_at)
  return closedMonthError(year, month)
}
