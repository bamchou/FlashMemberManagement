'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function togglePaymentStatus(eventId: string, currentStatus: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return

  const nextStatus = currentStatus === 'paid' ? 'unpaid' : 'paid'
  const adminSupabase = createAdminClient()
  await adminSupabase.from('events').update({ payment_status: nextStatus }).eq('id', eventId)

  revalidatePath('/accounting')
}
