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
