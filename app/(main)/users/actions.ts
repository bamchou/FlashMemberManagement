'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type UserFormState = { error: string } | undefined

export async function createUser(
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
  const role = formData.get('role') as string
  const password = formData.get('password') as string
  const passwordConfirm = formData.get('password_confirm') as string

  if (!username || !role || !password) {
    return { error: 'ユーザー名・役割・パスワードは必須です' }
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { error: 'ユーザー名は英数字とアンダースコアのみ使用できます' }
  }
  if (password.length < 6) {
    return { error: 'パスワードは6文字以上で設定してください' }
  }
  if (password !== passwordConfirm) {
    return { error: 'パスワードが一致しません' }
  }

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
      role,
    })
    .eq('id', newUser.id)

  if (profileError) {
    await adminSupabase.auth.admin.deleteUser(newUser.id)
    return { error: 'プロフィールの設定に失敗しました' }
  }

  revalidatePath('/users')
  redirect('/users')
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
  const role = formData.get('role') as string
  const password = formData.get('password') as string
  const passwordConfirm = formData.get('password_confirm') as string
  const birthDate = formData.get('birth_date') as string
  const badmintonStartDate = formData.get('badminton_start_date') as string
  const showOnMembersPage = formData.get('show_on_members_page') === 'on'
  const photo = formData.get('photo') as File | null

  if (!username || !role) return { error: 'ユーザー名・役割は必須です' }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { error: 'ユーザー名は英数字とアンダースコアのみ使用できます' }
  }
  if (password) {
    if (password.length < 6) return { error: 'パスワードは6文字以上で設定してください' }
    if (password !== passwordConfirm) return { error: 'パスワードが一致しません' }
  }

  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .neq('id', targetUserId)
    .single()

  if (existing) return { error: 'このユーザー名はすでに使用されています' }

  // 写真アップロード
  let photoUrl: string | undefined = undefined
  if (photo && photo.size > 0) {
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

  const adminSupabase = createAdminClient()

  const { error: profileError } = await adminSupabase
    .from('profiles')
    .update({
      username,
      display_name: displayName || null,
      role,
      birth_date: birthDate || null,
      badminton_start_date: badmintonStartDate || null,
      show_on_members_page: showOnMembersPage,
      ...(photoUrl !== undefined && { photo_url: photoUrl }),
    })
    .eq('id', targetUserId)

  if (profileError) return { error: 'ユーザー情報の更新に失敗しました' }

  await adminSupabase.auth.admin.updateUserById(targetUserId, {
    email: `${username}@flash.internal`,
    ...(password ? { password } : {}),
  })

  revalidatePath('/users')
  redirect('/users')
}

export async function deleteUser(targetUserId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return
  if (targetUserId === user.id) return // 自分自身は削除不可

  const adminSupabase = createAdminClient()
  await adminSupabase.auth.admin.deleteUser(targetUserId)
  revalidatePath('/users')
}
