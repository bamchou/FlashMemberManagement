'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function updatePracticeFee(
  frequency: number,
  monthlyFee: number
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラーが発生しました' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: '権限がありません' }

  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase
    .from('practice_fee_settings')
    .update({ monthly_fee: monthlyFee })
    .eq('frequency', frequency)

  if (error) return { error: '保存に失敗しました' }

  revalidatePath('/accounting/practice-fees')
  return {}
}
