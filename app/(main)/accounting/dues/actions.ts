'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function confirmDues(
  memberId: string,
  year: number,
  month: number,
  data: {
    baseFee: number
    excessYear: number
    excessMonth: number
    excessCount: number
    extraFeePerSession: number
    totalFee: number
    frequencySnapshot: number | null
    practiceDaysSnapshot: string[]
  },
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラー' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: '権限がありません' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('dues_snapshots')
    .upsert(
      {
        member_id: memberId,
        year,
        month,
        base_fee: data.baseFee,
        excess_year: data.excessYear,
        excess_month: data.excessMonth,
        excess_count: data.excessCount,
        extra_fee_per_session: data.extraFeePerSession,
        total_fee: data.totalFee,
        frequency_snapshot: data.frequencySnapshot,
        practice_days_snapshot: data.practiceDaysSnapshot,
        confirmed_by: user.id,
        confirmed_at: new Date().toISOString(),
      },
      { onConflict: 'member_id,year,month' },
    )

  if (error) return { error: '確定に失敗しました' }

  revalidatePath('/accounting/dues')
  return {}
}

export async function confirmAllDues(
  year: number,
  month: number,
  items: Array<{
    memberId: string
    baseFee: number
    excessYear: number
    excessMonth: number
    excessCount: number
    extraFeePerSession: number
    totalFee: number
    frequencySnapshot: number | null
    practiceDaysSnapshot: string[]
  }>,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラー' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: '権限がありません' }

  const admin = createAdminClient()
  const now = new Date().toISOString()

  const rows = items.map(item => ({
    member_id: item.memberId,
    year,
    month,
    base_fee: item.baseFee,
    excess_year: item.excessYear,
    excess_month: item.excessMonth,
    excess_count: item.excessCount,
    extra_fee_per_session: item.extraFeePerSession,
    total_fee: item.totalFee,
    frequency_snapshot: item.frequencySnapshot,
    practice_days_snapshot: item.practiceDaysSnapshot,
    confirmed_by: user.id,
    confirmed_at: now,
  }))

  const { error } = await admin
    .from('dues_snapshots')
    .upsert(rows, { onConflict: 'member_id,year,month' })

  if (error) return { error: '一括確定に失敗しました' }

  revalidatePath('/accounting/dues')
  return {}
}

export async function unconfirmDues(
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

  const { data: payment } = await admin
    .from('dues_payments')
    .select('member_id')
    .eq('member_id', memberId)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle()

  if (payment) return { error: '支払い済みのため確定取消できません' }

  const { error } = await admin
    .from('dues_snapshots')
    .delete()
    .eq('member_id', memberId)
    .eq('year', year)
    .eq('month', month)

  if (error) return { error: '確定取消に失敗しました' }

  revalidatePath('/accounting/dues')
  return {}
}

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

export async function updateMemberFrequency(
  memberId: string,
  frequency: number | null,
  practiceDays: string[],
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラー' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: '権限がありません' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('members')
    .update({ practice_frequency: frequency, practice_days: practiceDays })
    .eq('id', memberId)

  if (error) return { error: '更新に失敗しました' }

  revalidatePath('/accounting/dues')
  revalidatePath('/accounting/dues-frequency')
  return {}
}
