'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function markDuesPaid(
  memberId: string,
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
    .from('dues_payments')
    .upsert(
      { member_id: memberId, year, month, amount, paid_at: new Date().toISOString() },
      { onConflict: 'member_id,year,month' },
    )

  if (error) return { error: '保存に失敗しました' }

  revalidatePath('/accounting/dues')
  return {}
}

export async function markDuesUnpaid(
  memberId: string,
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
    .from('dues_payments')
    .delete()
    .eq('member_id', memberId)
    .eq('year', year)
    .eq('month', month)

  if (error) return { error: '取り消しに失敗しました' }

  revalidatePath('/accounting/dues')
  return {}
}
