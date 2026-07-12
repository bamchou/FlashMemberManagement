'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function updateAccompanimentFee(
  areaType: string,
  amount: number,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラーが発生しました' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: '権限がありません' }

  if (!amount || amount <= 0) return { error: '金額は1円以上で入力してください' }

  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase
    .from('accompaniment_fee_settings')
    .update({ amount_per_person: amount, updated_at: new Date().toISOString() })
    .eq('area_type', areaType)

  if (error) return { error: '更新に失敗しました' }

  revalidatePath('/accounting/accompaniment')
  return {}
}
