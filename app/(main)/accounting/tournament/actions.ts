'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { closedMonthErrorForEvent } from '@/lib/accounting/closing'

// 大会参加費の支払状態を切り替え（管理者のみ）
export async function toggleTournamentPaid(
  eventId: string,
  memberId: string,
  currentPaid: boolean,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラー' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: '権限がありません' }

  const lockError = await closedMonthErrorForEvent(eventId)
  if (lockError) return { error: lockError }

  const admin = createAdminClient()
  const { error } = await admin
    .from('event_participants')
    .update({ is_paid: !currentPaid })
    .eq('event_id', eventId)
    .eq('member_id', memberId)
  if (error) return { error: '更新に失敗しました' }

  revalidatePath('/accounting/tournament')
  revalidatePath(`/accounting/tournament/${eventId}`)
  return {}
}
