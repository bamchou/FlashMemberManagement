'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function updateCoachRate(
  coachId: string,
  ratePractice: number | null,
  rateTournament: number | null,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラー' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: '権限がありません' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ coach_rate_practice: ratePractice, coach_rate_tournament: rateTournament })
    .eq('id', coachId)

  if (error) return { error: '単価の更新に失敗しました' }
  revalidatePath('/accounting/coach-pay-rates')
  revalidatePath('/accounting/coach-pay')
  revalidatePath('/profile')
  return {}
}
