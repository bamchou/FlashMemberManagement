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

  if (!monthlyFee || monthlyFee <= 0) return { error: '金額は1円以上で入力してください' }

  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase
    .from('practice_fee_settings')
    .update({ monthly_fee: monthlyFee })
    .eq('frequency', frequency)

  if (error) return { error: '保存に失敗しました' }

  revalidatePath('/accounting/practice-fees')
  return {}
}

export async function updateExtraPracticeFee(
  feePerSession: number
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラーが発生しました' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: '権限がありません' }

  if (feePerSession < 0) return { error: '0円以上で入力してください' }

  const adminSupabase = createAdminClient()
  const { data: row } = await adminSupabase
    .from('extra_practice_fee_settings')
    .select('id')
    .limit(1)
    .single()

  if (!row) return { error: '設定が見つかりません' }

  const { error } = await adminSupabase
    .from('extra_practice_fee_settings')
    .update({ fee_per_session: feePerSession, updated_at: new Date().toISOString() })
    .eq('id', row.id)

  if (error) return { error: '保存に失敗しました' }

  revalidatePath('/accounting/practice-fees')
  revalidatePath('/accounting/dues')
  return {}
}
