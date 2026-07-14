'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type UserFormState = { error: string } | undefined
export type CreateUserState = { error: string } | { password: string } | undefined

export async function createUser(
  _state: CreateUserState,
  formData: FormData
): Promise<CreateUserState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラーが発生しました' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { error: '権限がありません' }

  const username = (formData.get('username') as string).trim()
  const displayName = (formData.get('display_name') as string).trim()
  const displayNameKana = (formData.get('display_name_kana') as string | null)?.trim() || null
  const role = formData.get('role') as string
  const qualifications = (formData.get('qualifications') as string | null)?.trim() || null

  if (!username || !role) {
    return { error: 'ユーザー名・役割は必須です' }
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { error: 'ユーザー名は英数字とアンダースコアのみ使用できます' }
  }

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
  const password = Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')

  // ユーザー名の重複チェック
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .single()

  if (existing) return { error: 'このユーザー名はすでに使用されています' }

  const adminSupabase = createAdminClient()
  const email = `${username}@flash.internal`

  const { data: { user: newUser }, error: createError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createError || !newUser) {
    return { error: `ユーザーの作成に失敗しました: ${createError?.message ?? ''}` }
  }

  const { error: profileError } = await adminSupabase
    .from('profiles')
    .update({
      username,
      display_name: displayName || null,
      display_name_kana: displayNameKana,
      role,
      temp_password: password,
      qualifications: (role === 'admin' || role === 'coach') ? qualifications : null,
    })
    .eq('id', newUser.id)

  if (profileError) {
    await adminSupabase.auth.admin.deleteUser(newUser.id)
    return { error: 'プロフィールの設定に失敗しました' }
  }

  revalidatePath('/users')
  return { password }
}

export async function resetPassword(targetUserId: string): Promise<{ password: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラーが発生しました' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: '権限がありません' }

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
  const password = Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')

  const adminSupabase = createAdminClient()
  const { error: authError } = await adminSupabase.auth.admin.updateUserById(targetUserId, { password })
  if (authError) return { error: 'パスワードの再発行に失敗しました' }

  await adminSupabase.from('profiles').update({ temp_password: password }).eq('id', targetUserId)
  revalidatePath('/users')
  return { password }
}

export async function updateUser(
  targetUserId: string,
  _state: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラーが発生しました' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { error: '権限がありません' }

  const username = (formData.get('username') as string).trim()
  const displayName = (formData.get('display_name') as string).trim()
  const displayNameKana = (formData.get('display_name_kana') as string | null)?.trim() || null
  const role = formData.get('role') as string
  const birthDate = formData.get('birth_date') as string
  const badmintonStartDate = formData.get('badminton_start_date') as string
  const showOnMembersPage = formData.get('show_on_members_page') === 'on'
  const qualificationsRaw = (formData.get('qualifications') as string | null)?.trim() || null
  const photo = formData.get('photo') as File | null

  if (!username || !role) return { error: 'ユーザー名・役割は必須です' }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { error: 'ユーザー名は英数字とアンダースコアのみ使用できます' }
  }

  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .neq('id', targetUserId)
    .single()

  if (existing) return { error: 'このユーザー名はすでに使用されています' }

  const adminSupabase = createAdminClient()

  // 写真アップロード
  let photoUrl: string | undefined = undefined
  if (photo && photo.size > 0) {
    // 旧写真を削除
    const { data: currentProfile } = await adminSupabase.from('profiles').select('photo_url').eq('id', targetUserId).single()
    if (currentProfile?.photo_url) {
      const oldPath = currentProfile.photo_url.split('/member-photos/')[1]
      if (oldPath) await supabase.storage.from('member-photos').remove([decodeURIComponent(oldPath)])
    }
    const ext = photo.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `profiles/${targetUserId}.${ext}`
    const arrayBuffer = await photo.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from('member-photos')
      .upload(path, arrayBuffer, { upsert: true, contentType: photo.type || 'image/jpeg' })
    if (uploadError) return { error: `写真のアップロードに失敗しました: ${uploadError.message}` }
    const { data: { publicUrl } } = supabase.storage.from('member-photos').getPublicUrl(path)
    photoUrl = publicUrl
  }

  const { error: profileError } = await adminSupabase
    .from('profiles')
    .update({
      username,
      display_name: displayName || null,
      display_name_kana: displayNameKana,
      role,
      birth_date: birthDate || null,
      badminton_start_date: badmintonStartDate || null,
      show_on_members_page: showOnMembersPage,
      qualifications: (role === 'admin' || role === 'coach') ? qualificationsRaw : null,
      ...(photoUrl !== undefined && { photo_url: photoUrl }),
    })
    .eq('id', targetUserId)

  if (profileError) return { error: 'ユーザー情報の更新に失敗しました' }

  await adminSupabase.auth.admin.updateUserById(targetUserId, {
    email: `${username}@flash.internal`,
  })

  revalidatePath('/users')
  redirect('/users')
}

export async function toggleUserVisibility(targetUserId: string, show: boolean): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return

  const adminSupabase = createAdminClient()
  await adminSupabase.from('profiles').update({ show_on_members_page: show }).eq('id', targetUserId)
  revalidatePath('/users')
  revalidatePath('/members')
}

export async function deleteUser(targetUserId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラーが発生しました' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { error: '権限がありません' }
  if (targetUserId === user.id) return { error: '自分自身は削除できません' }

  const adminSupabase = createAdminClient()

  // push_notification_log → push_subscriptions → その他の順で削除
  const { data: subs } = await adminSupabase
    .from('push_subscriptions')
    .select('id')
    .eq('user_id', targetUserId)
  const subIds = (subs ?? []).map(s => s.id)
  if (subIds.length > 0) {
    await adminSupabase.from('push_notification_log').delete().in('subscription_id', subIds)
  }
  await adminSupabase.from('push_subscriptions').delete().eq('user_id', targetUserId)
  await adminSupabase.from('members').update({ guardian_id: null }).eq('guardian_id', targetUserId)
  await adminSupabase.from('event_participants').update({ registered_by: null }).eq('registered_by', targetUserId)
  await adminSupabase.from('announcement_comments').delete().eq('user_id', targetUserId)
  await adminSupabase.from('events').update({ created_by: null }).eq('created_by', targetUserId)
  await adminSupabase.from('announcements').update({ created_by: null }).eq('created_by', targetUserId)
  await adminSupabase.from('coach_notes').update({ created_by: null }).eq('created_by', targetUserId)

  const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(targetUserId)
  if (deleteError) {
    const msg = deleteError.message || deleteError.name || deleteError.status?.toString() || JSON.stringify(deleteError)
    console.error('[deleteUser] auth.admin.deleteUser failed:', deleteError)
    return { error: `削除に失敗しました: ${msg}` }
  }

  revalidatePath('/users')
  return {}
}
