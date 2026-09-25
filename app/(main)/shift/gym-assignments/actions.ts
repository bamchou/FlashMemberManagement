'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/** 日付の予約担当者を設定する。assigneeId が空なら割当を解除 */
export async function setGymAssignment(
  targetDate: string,
  assigneeId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラー' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: '権限がありません' }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) return { error: '日付が不正です' }

  const admin = createAdminClient()
  if (!assigneeId) {
    const { error } = await admin.from('gym_reservation_assignments').delete().eq('target_date', targetDate)
    if (error) return { error: '解除に失敗しました' }
  } else {
    const { error } = await admin.from('gym_reservation_assignments').upsert(
      {
        target_date: targetDate,
        assignee_id: assigneeId,
        assigned_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'target_date' },
    )
    if (error) return { error: '保存に失敗しました' }
  }

  revalidatePath('/shift/gym-assignments')
  revalidatePath('/calendar')
  return {}
}
