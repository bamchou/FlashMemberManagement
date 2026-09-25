'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * 日付の予約担当（枠1〜3）と予約する体育館を設定する。assigneeId が空なら割当を解除。
 * 同じ人を同じ日に割り当てられるのは、その人の予約アカウント数まで。
 */
export async function setGymAssignment(
  targetDate: string,
  slot: number,
  assigneeId: string,
  candidateId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラー' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: '権限がありません' }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) return { error: '日付が不正です' }
  if (!Number.isInteger(slot) || slot < 1 || slot > 3) return { error: '枠が不正です' }

  const admin = createAdminClient()
  if (!assigneeId) {
    const { error } = await admin
      .from('gym_reservation_assignments')
      .delete()
      .eq('target_date', targetDate)
      .eq('slot', slot)
    if (error) return { error: '解除に失敗しました' }
  } else {
    // 体育館はその日の曜日の候補から選ぶ
    if (candidateId) {
      const [y, m, d] = targetDate.split('-').map(Number)
      const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
      const { data: cand } = await admin.from('gym_candidates').select('weekday').eq('id', candidateId).maybeSingle()
      if (!cand || cand.weekday !== weekday) return { error: 'この曜日の候補ではない体育館です' }
    }

    const [{ data: person }, { data: others }] = await Promise.all([
      admin.from('profiles').select('display_name, username, gym_account_count').eq('id', assigneeId).single(),
      admin
        .from('gym_reservation_assignments')
        .select('slot')
        .eq('target_date', targetDate)
        .eq('assignee_id', assigneeId)
        .neq('slot', slot),
    ])
    if (!person) return { error: '担当者が見つかりません' }
    const accounts = person.gym_account_count ?? 0
    const name = person.display_name ?? person.username ?? ''
    if (accounts < 1) return { error: `${name}さんは予約アカウントが登録されていません` }
    if ((others ?? []).length + 1 > accounts) {
      return { error: `${name}さんの予約アカウントは${accounts}件のため、この日にはこれ以上割り当てられません` }
    }

    const { error } = await admin.from('gym_reservation_assignments').upsert(
      {
        target_date: targetDate,
        slot,
        assignee_id: assigneeId,
        gym_candidate_id: candidateId || null,
        assigned_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'target_date,slot' },
    )
    if (error) return { error: '保存に失敗しました' }
  }

  revalidatePath('/shift/gym-assignments')
  revalidatePath('/calendar')
  return {}
}
