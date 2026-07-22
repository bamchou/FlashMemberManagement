'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'


export async function changeExtraPractice(
  memberId: string,
  year: number,
  month: number,
  delta: 1 | -1,
): Promise<{ count?: number; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラー' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: '権限がありません' }

  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('extra_practice_counts')
    .select('id, count')
    .eq('member_id', memberId)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle()

  const newCount = Math.max(0, (existing?.count ?? 0) + delta)

  if (existing) {
    await admin
      .from('extra_practice_counts')
      .update({ count: newCount, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else if (newCount > 0) {
    await admin
      .from('extra_practice_counts')
      .insert({ member_id: memberId, year, month, count: newCount })
  }

  revalidatePath('/accounting/extra-practice')
  return { count: newCount }
}
