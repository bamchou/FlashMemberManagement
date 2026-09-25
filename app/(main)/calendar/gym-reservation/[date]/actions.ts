'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { weekdayOf } from '@/lib/gymCandidates'

const TIME = /^\d{2}:\d{2}$/

/**
 * 体育館予約の担当枠から、練習を仮登録する（担当者本人または管理者）。
 * 登録した予定は枠に紐づけ、同じ枠からの二重登録を防ぐ。
 */
export async function registerProvisionalPractice(
  targetDate: string,
  slot: number,
  candidateId: string,
  startTime: string,
  endTime: string,
): Promise<{ error?: string; eventId?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラー' }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) return { error: '日付が不正です' }
  if (!candidateId) return { error: '体育館を選んでください' }
  if (!TIME.test(startTime) || !TIME.test(endTime)) return { error: '開始・終了時刻を入力してください' }
  if (endTime <= startTime) return { error: '終了時刻は開始時刻より後にしてください' }

  const admin = createAdminClient()
  const [{ data: profile }, { data: assignment }, { data: cand }] = await Promise.all([
    admin.from('profiles').select('role, display_name, username').eq('id', user.id).single(),
    admin
      .from('gym_reservation_assignments')
      .select('id, assignee_id, event_id')
      .eq('target_date', targetDate)
      .eq('slot', slot)
      .maybeSingle(),
    admin.from('gym_candidates').select('weekday, gym_name, courts').eq('id', candidateId).maybeSingle(),
  ])

  if (!assignment) return { error: 'この枠の割当が見つかりません' }
  if (assignment.assignee_id !== user.id && profile?.role !== 'admin') return { error: '権限がありません' }
  if (assignment.event_id) return { error: 'この枠からはすでに仮登録されています' }
  if (!cand || cand.weekday !== weekdayOf(targetDate)) return { error: 'この曜日の候補ではない体育館です' }

  const { data: assignee } = await admin
    .from('profiles')
    .select('display_name, username')
    .eq('id', assignment.assignee_id)
    .single()
  const assigneeName = assignee?.display_name ?? assignee?.username ?? ''
  const gymLabel = `${cand.gym_name}${cand.courts != null ? ` ${cand.courts}面` : ''}`

  const { data: newEvent, error } = await admin.from('events').insert({
    title: `練習（${cand.gym_name}）`,
    description: `${gymLabel}\n体育館予約：${assigneeName}`,
    event_type: 'practice',
    target: 'all',
    start_at: new Date(`${targetDate}T${startTime}:00+09:00`).toISOString(),
    end_at: new Date(`${targetDate}T${endTime}:00+09:00`).toISOString(),
    status: 'provisional',
    is_all_day: false,
    needs_coach: true, // 練習はデフォルトで参加要請ON
    created_by: user.id,
  }).select('id').single()
  if (error || !newEvent) return { error: '練習の仮登録に失敗しました' }

  const { error: linkError } = await admin
    .from('gym_reservation_assignments')
    .update({ gym_candidate_id: candidateId, event_id: newEvent.id, updated_at: new Date().toISOString() })
    .eq('id', assignment.id)
  if (linkError) return { error: '仮登録はできましたが、割当への紐づけに失敗しました' }

  revalidatePath('/calendar')
  revalidatePath(`/calendar/gym-reservation/${targetDate}`)
  revalidatePath('/shift/coach')
  revalidatePath('/shift/gym-assignments')
  return { eventId: newEvent.id }
}
