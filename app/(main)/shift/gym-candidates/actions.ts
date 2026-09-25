'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type CandidateInput = {
  priority: number
  gym_name: string
  courts: string // 数字 または ''
  start_time: string // 'HH:MM' または ''
  end_time: string
}

const TIME = /^\d{2}:\d{2}(:\d{2})?$/

/** 1つの曜日の第1〜第4候補をまとめて保存する。体育館名が空の候補は削除 */
export async function saveWeekdayCandidates(
  weekday: number,
  rows: CandidateInput[],
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラー' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: '権限がありません' }

  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return { error: '曜日が不正です' }

  const upserts: {
    weekday: number; priority: number; gym_name: string; courts: number | null
    start_time: string | null; end_time: string | null; updated_at: string
  }[] = []
  const deletes: number[] = []
  const now = new Date().toISOString()

  for (const r of rows) {
    const p = r.priority
    if (!Number.isInteger(p) || p < 1 || p > 4) return { error: '候補の番号が不正です' }
    const name = r.gym_name.trim()
    const courts = r.courts.trim()
    const start = r.start_time.trim()
    const end = r.end_time.trim()

    if (!name) {
      if (courts || start || end) return { error: `第${p}候補：体育館名を入力してください` }
      deletes.push(p)
      continue
    }
    if (courts && !/^\d{1,2}$/.test(courts)) return { error: `第${p}候補：面数は数字で入力してください` }
    if ((start && !TIME.test(start)) || (end && !TIME.test(end))) return { error: `第${p}候補：時刻が不正です` }
    if (start && end && end.slice(0, 5) <= start.slice(0, 5)) return { error: `第${p}候補：終了時刻は開始時刻より後にしてください` }

    upserts.push({
      weekday, priority: p, gym_name: name, courts: courts ? parseInt(courts, 10) : null,
      start_time: start || null, end_time: end || null, updated_at: now,
    })
  }

  const admin = createAdminClient()
  if (upserts.length > 0) {
    const { error } = await admin.from('gym_candidates').upsert(upserts, { onConflict: 'weekday,priority' })
    if (error) return { error: '保存に失敗しました' }
  }
  if (deletes.length > 0) {
    const { error } = await admin.from('gym_candidates').delete().eq('weekday', weekday).in('priority', deletes)
    if (error) return { error: '保存に失敗しました' }
  }

  revalidatePath('/shift/gym-candidates')
  return {}
}
