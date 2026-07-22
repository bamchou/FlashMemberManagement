'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function reenrollMembers(selectedMemberIds: string[]): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラーが発生しました' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('pending_reenrollment')
    .eq('id', user.id)
    .single()

  if (!profile?.pending_reenrollment) return { error: '再入会処理が不要な状態です' }
  if (selectedMemberIds.length === 0) return { error: 'お子様を1名以上選択してください' }

  const admin = createAdminClient()

  // 選択されたメンバーが全てこの保護者のものか確認
  const { data: members } = await admin
    .from('members')
    .select('id, guardian_id')
    .in('id', selectedMemberIds)

  const allOwned = (members ?? []).every(m => m.guardian_id === user.id)
  if (!allOwned) return { error: '権限がありません' }

  const { error: updateError } = await admin
    .from('members')
    .update({ withdrawn_at: null, is_visible: true })
    .in('id', selectedMemberIds)

  if (updateError) return { error: '復活処理に失敗しました' }

  await admin.from('profiles').update({ pending_reenrollment: false }).eq('id', user.id)

  revalidatePath('/members')
  return {}
}
