'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// 親睦会・イベントの参加費支払状態を切り替え（管理者のみ）
export async function toggleAttendancePaid(
  eventId: string,
  userId: string,
  currentPaid: boolean,
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return

  const admin = createAdminClient()
  await admin
    .from('event_attendances')
    .update({ is_paid: !currentPaid, updated_at: new Date().toISOString() })
    .eq('event_id', eventId)
    .eq('user_id', userId)

  revalidatePath('/accounting/event-fees')
  revalidatePath(`/calendar/${eventId}`)
}
