'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type MemberFormState = { error: string } | undefined

async function uploadPhoto(supabase: Awaited<ReturnType<typeof createClient>>, memberId: string, photo: File): Promise<{ url: string } | { error: string }> {
  const ext = photo.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${memberId}.${ext}`
  const arrayBuffer = await photo.arrayBuffer()
  const { error } = await supabase.storage
    .from('member-photos')
    .upload(path, arrayBuffer, { upsert: true, contentType: photo.type || 'image/jpeg' })
  if (error) return { error: `写真のアップロードに失敗しました: ${error.message}` }
  const { data: { publicUrl } } = supabase.storage
    .from('member-photos')
    .getPublicUrl(path)
  return { url: publicUrl }
}

export async function createMember(
  _state: MemberFormState,
  formData: FormData
): Promise<MemberFormState> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラーが発生しました' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { error: '権限がありません' }

  const fullName = (formData.get('full_name') as string).trim()
  const gender = formData.get('gender') as string
  const birthDate = formData.get('birth_date') as string
  const joinDate = formData.get('join_date') as string
  const badmintonStartDate = formData.get('badminton_start_date') as string
  const playStyle = (formData.get('play_style') as string).trim()
  const photo = formData.get('photo') as File | null

  if (!fullName || !birthDate || !joinDate) {
    return { error: '氏名・生年月日・加入年月日は必須です' }
  }

  const { data: member, error } = await supabase
    .from('members')
    .insert({
      full_name: fullName,
      gender: gender || null,
      birth_date: birthDate,
      join_date: joinDate,
      badminton_start_date: badmintonStartDate || null,
      play_style: playStyle || null,
    })
    .select('id')
    .single()

  if (error || !member) return { error: 'メンバーの登録に失敗しました' }

  if (photo && photo.size > 0) {
    const result = await uploadPhoto(supabase, member.id, photo)
    if ('error' in result) return { error: result.error }
    await supabase.from('members').update({ photo_url: result.url }).eq('id', member.id)
  }

  revalidatePath('/members')
  redirect('/members')
}

export async function updateMember(
  id: string,
  _state: MemberFormState,
  formData: FormData
): Promise<MemberFormState> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラーが発生しました' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { error: '権限がありません' }

  const fullName = (formData.get('full_name') as string).trim()
  const gender = formData.get('gender') as string
  const birthDate = formData.get('birth_date') as string
  const joinDate = formData.get('join_date') as string
  const badmintonStartDate = formData.get('badminton_start_date') as string
  const playStyle = (formData.get('play_style') as string).trim()
  const photo = formData.get('photo') as File | null

  if (!fullName || !birthDate || !joinDate) {
    return { error: '氏名・生年月日・加入年月日は必須です' }
  }

  let photoUrl: string | undefined = undefined
  if (photo && photo.size > 0) {
    const result = await uploadPhoto(supabase, id, photo)
    if ('error' in result) return { error: result.error }
    photoUrl = result.url
  }

  const { error } = await supabase
    .from('members')
    .update({
      full_name: fullName,
      gender: gender || null,
      birth_date: birthDate,
      join_date: joinDate,
      badminton_start_date: badmintonStartDate || null,
      play_style: playStyle || null,
      ...(photoUrl !== undefined && { photo_url: photoUrl }),
    })
    .eq('id', id)

  if (error) return { error: 'メンバー情報の更新に失敗しました' }

  revalidatePath(`/members/${id}`)
  revalidatePath('/members')
  redirect(`/members/${id}`)
}

export async function deleteMember(id: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return

  // 写真も削除
  const { data: member } = await supabase.from('members').select('photo_url').eq('id', id).single()
  if (member?.photo_url) {
    const path = member.photo_url.split('/member-photos/')[1]
    if (path) await supabase.storage.from('member-photos').remove([path])
  }

  await supabase.from('members').delete().eq('id', id)

  revalidatePath('/members')
  redirect('/members')
}
