'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function withdrawMember(memberId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラーが発生しました' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  const admin = createAdminClient()
  const { data: member } = await admin.from('members').select('id, guardian_id').eq('id', memberId).single()
  if (!member) return { error: 'メンバーが見つかりません' }

  if (!isAdmin && member.guardian_id !== user.id) return { error: '権限がありません' }

  const { error } = await admin
    .from('members')
    .update({ withdrawn_at: new Date().toISOString(), is_visible: false })
    .eq('id', memberId)

  if (error) return { error: '退会処理に失敗しました' }

  revalidatePath('/members')
  revalidatePath(`/members/${memberId}`)
  return {}
}

export async function requestRejoin(memberId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラーが発生しました' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  const admin = createAdminClient()
  const { data: member } = await admin
    .from('members')
    .select('id, guardian_id, withdrawn_at')
    .eq('id', memberId)
    .single()
  if (!member) return { error: 'メンバーが見つかりません' }
  if (!member.withdrawn_at) return { error: '退会済みではありません' }
  if (!isAdmin && member.guardian_id !== user.id) return { error: '権限がありません' }

  if (isAdmin) {
    // 管理者は直接復帰（承認済み・表示）
    const { error } = await admin
      .from('members')
      .update({ withdrawn_at: null, is_visible: true, approval_status: 'approved' })
      .eq('id', memberId)
    if (error) return { error: '復帰処理に失敗しました' }
  } else {
    // 保護者は申請（管理者が承認待ちセクションから承認）
    const { error } = await admin
      .from('members')
      .update({ withdrawn_at: null, is_visible: false, approval_status: 'pending' })
      .eq('id', memberId)
    if (error) return { error: '復帰申請に失敗しました' }
  }

  revalidatePath('/members')
  revalidatePath(`/members/${memberId}`)
  return {}
}
