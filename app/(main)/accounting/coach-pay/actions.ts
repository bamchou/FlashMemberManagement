'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function markCoachPaid(
  coachId: string,
  year: number,
  month: number,
  amount: number,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラー' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: '権限がありません' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('coach_monthly_payments')
    .upsert(
      { coach_id: coachId, year, month, amount, paid_at: new Date().toISOString(), paid_by: user.id },
      { onConflict: 'coach_id,year,month' },
    )

  if (error) return { error: '支払い記録の保存に失敗しました' }
  revalidatePath('/accounting/coach-pay')
  return {}
}

export async function markCoachUnpaid(
  coachId: string,
  year: number,
  month: number,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラー' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: '権限がありません' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('coach_monthly_payments')
    .delete()
    .eq('coach_id', coachId)
    .eq('year', year)
    .eq('month', month)

  if (error) return { error: '支払い記録の削除に失敗しました' }
  revalidatePath('/accounting/coach-pay')
  return {}
}
