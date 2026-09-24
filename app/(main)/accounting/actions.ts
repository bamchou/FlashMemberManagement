'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { closedMonthErrorForEvent } from '@/lib/accounting/closing'

export async function togglePaymentStatus(eventId: string, currentStatus: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラー' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: '権限がありません' }

  const lockError = await closedMonthErrorForEvent(eventId)
  if (lockError) return { error: lockError }

  const nextStatus = currentStatus === 'paid' ? 'unpaid' : 'paid'
  const adminSupabase = createAdminClient()
  await adminSupabase.from('events').update({ payment_status: nextStatus }).eq('id', eventId)

  revalidatePath('/accounting/gym')
  return {}
}
