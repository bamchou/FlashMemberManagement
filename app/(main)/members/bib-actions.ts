'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { BibStatus } from '@/lib/types'

export async function requestBib(memberId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラー' }

  const adminSupabase = createAdminClient()

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'member') return { error: '権限がありません' }

  const { data: member } = await adminSupabase
    .from('members')
    .select('guardian_id, approval_status')
    .eq('id', memberId)
    .single()
  if (!member || member.guardian_id !== user.id) return { error: '権限がありません' }
  if (member.approval_status !== 'approved') return { error: '承認済みのメンバーのみ依頼できます' }

  const { data: existing } = await adminSupabase
    .from('bib_requests')
    .select('id')
    .eq('member_id', memberId)
    .maybeSingle()
  if (existing) return { error: 'すでにゼッケン作成依頼済みです' }

  const { error } = await adminSupabase.from('bib_requests').insert({
    member_id: memberId,
    requested_by: user.id,
  })
  if (error) return { error: 'ゼッケン作成依頼に失敗しました' }

  revalidatePath(`/members/${memberId}`)
  revalidatePath('/accounting/bib')
  return {}
}

export async function updateBibStatus(
  requestId: string,
  newStatus: Extract<BibStatus, 'ordered' | 'delivered'>,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラー' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: '権限がありません' }

  const adminSupabase = createAdminClient()
  const updateData: Record<string, unknown> = { status: newStatus }
  if (newStatus === 'ordered') updateData.ordered_at = new Date().toISOString()
  if (newStatus === 'delivered') updateData.delivered_at = new Date().toISOString()

  const { data: updated, error } = await adminSupabase
    .from('bib_requests')
    .update(updateData)
    .eq('id', requestId)
    .select('member_id')
    .single()

  if (error || !updated) return { error: 'ステータスの更新に失敗しました' }

  revalidatePath(`/members/${updated.member_id}`)
  revalidatePath('/accounting/bib')
  return {}
}
