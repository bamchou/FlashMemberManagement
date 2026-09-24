'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeMonthlySummary } from '@/lib/accounting/monthlySummary'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, error: '認証エラー' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { user: null, error: '権限がありません' }
  return { user, error: null }
}

function revalidateAccounting() {
  for (const p of [
    '/accounting/closing', '/accounting/report', '/accounting/dues', '/accounting/gym',
    '/accounting/tournament', '/accounting/event-fees', '/accounting/coach-pay',
    '/accounting/expenses', '/accounting/extra-practice',
  ]) revalidatePath(p)
}

// 月を締める：その時点の集計を記録し、以後その月のお金の変更をロックする
export async function closeMonth(year: number, month: number): Promise<{ error?: string }> {
  const { user, error: authError } = await requireAdmin()
  if (!user) return { error: authError! }

  // まだ始まっていない月は締められない
  const nowJST = new Date(new Date().getTime() + 9 * 60 * 60 * 1000)
  const cur = nowJST.getUTCFullYear() * 12 + nowJST.getUTCMonth()
  if (year * 12 + (month - 1) > cur) return { error: '未来の月は締められません' }

  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('monthly_closings').select('year').eq('year', year).eq('month', month).maybeSingle()
  if (existing) return { error: 'この月はすでに締め済みです' }

  const summary = await computeMonthlySummary(year, month)
  const { error } = await admin.from('monthly_closings').insert({
    year, month, summary, closed_by: user.id, closed_at: new Date().toISOString(),
  })
  if (error) return { error: '締めに失敗しました' }

  revalidateAccounting()
  return {}
}

// 締めを解除する（管理者のみ）。解除するとその月の変更が再びできるようになる
export async function reopenMonth(year: number, month: number): Promise<{ error?: string }> {
  const { user, error: authError } = await requireAdmin()
  if (!user) return { error: authError! }

  const admin = createAdminClient()
  const { error } = await admin.from('monthly_closings').delete().eq('year', year).eq('month', month)
  if (error) return { error: '締めの解除に失敗しました' }

  revalidateAccounting()
  return {}
}
