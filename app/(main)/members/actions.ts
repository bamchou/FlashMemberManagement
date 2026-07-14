'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

  const role = profile?.role
  if (role !== 'admin' && role !== 'member') return { error: '権限がありません' }

  const isAdmin = role === 'admin'

  const fullName = (formData.get('full_name') as string).trim()
  const gender = formData.get('gender') as string
  const birthDate = formData.get('birth_date') as string
  const joinDate = formData.get('join_date') as string
  const badmintonStartDate = formData.get('badminton_start_date') as string
  const playStyle = (formData.get('play_style') as string | null)?.trim() ?? ''
  const registrationNumber = isAdmin ? (formData.get('registration_number') as string | null)?.trim() ?? '' : ''
  const photo = formData.get('photo') as File | null
  const practiceFrequency = formData.get('practice_frequency') ? Number(formData.get('practice_frequency')) : null
  const practiceDaysRaw = formData.getAll('practice_days') as string[]
  const practiceDays = practiceDaysRaw.length > 0 ? practiceDaysRaw : null

  if (!fullName || !birthDate || !joinDate) {
    return { error: '氏名・生年月日・加入年月日は必須です' }
  }
  if (registrationNumber && !/^\d{10}$/.test(registrationNumber)) {
    return { error: '登録番号は数字10桁で入力してください' }
  }

  // adminClient で RLS をバイパスして INSERT（保護者の場合 RLS INSERT を通すためにも使う）
  const adminSupabase = createAdminClient()

  const { data: member, error } = await adminSupabase
    .from('members')
    .insert({
      full_name: fullName,
      gender: gender || null,
      birth_date: birthDate,
      join_date: joinDate,
      badminton_start_date: badmintonStartDate || null,
      play_style: playStyle || null,
      registration_number: isAdmin ? (registrationNumber || null) : null,
      guardian_id: isAdmin ? null : user.id,
      approval_status: isAdmin ? 'approved' : 'pending',
      is_visible: isAdmin ? true : false,
      practice_frequency: practiceFrequency,
      practice_days: practiceDays,
    })
    .select('id')
    .single()

  if (error || !member) return { error: 'メンバーの登録に失敗しました' }

  if (photo && photo.size > 0) {
    const result = await uploadPhoto(supabase, member.id, photo)
    if ('error' in result) return { error: result.error }
    await adminSupabase.from('members').update({ photo_url: result.url }).eq('id', member.id)
  }

  revalidatePath('/members')
  redirect('/members')
}

export async function approveMember(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return

  const adminSupabase = createAdminClient()
  await adminSupabase
    .from('members')
    .update({ approval_status: 'approved', is_visible: true })
    .eq('id', id)

  revalidatePath('/members')
}

export async function rejectMember(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return

  const adminSupabase = createAdminClient()
  const { data: member } = await adminSupabase.from('members').select('photo_url').eq('id', id).single()
  if (member?.photo_url) {
    const path = member.photo_url.split('/member-photos/')[1]
    if (path) await supabase.storage.from('member-photos').remove([path])
  }
  await adminSupabase.from('members').delete().eq('id', id)

  revalidatePath('/members')
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

  const isAdmin = profile?.role === 'admin'

  if (!isAdmin) {
    // 保護者は自分の子供のみ編集可
    const { data: target } = await supabase.from('members').select('guardian_id').eq('id', id).single()
    if (profile?.role !== 'member' || target?.guardian_id !== user.id) return { error: '権限がありません' }
  }

  const fullName = (formData.get('full_name') as string).trim()
  const gender = formData.get('gender') as string
  const birthDate = formData.get('birth_date') as string
  const joinDate = formData.get('join_date') as string
  const badmintonStartDate = formData.get('badminton_start_date') as string
  const playStyle = (formData.get('play_style') as string).trim()
  const registrationNumber = isAdmin ? (formData.get('registration_number') as string).trim() : ''
  const isVisible = isAdmin ? formData.get('is_visible') === 'on' : undefined
  const photo = formData.get('photo') as File | null
  const practiceFrequency = formData.get('practice_frequency') ? Number(formData.get('practice_frequency')) : null
  const practiceDaysRaw = formData.getAll('practice_days') as string[]
  const practiceDays = practiceDaysRaw.length > 0 ? practiceDaysRaw : null

  if (!fullName || !birthDate || !joinDate) {
    return { error: '氏名・生年月日・加入年月日は必須です' }
  }
  if (registrationNumber && !/^\d{10}$/.test(registrationNumber)) {
    return { error: '登録番号は数字10桁で入力してください' }
  }

  let photoUrl: string | undefined = undefined
  if (photo && photo.size > 0) {
    // 旧写真を削除
    const { data: current } = await supabase.from('members').select('photo_url').eq('id', id).single()
    if (current?.photo_url) {
      const oldPath = current.photo_url.split('/member-photos/')[1]
      if (oldPath) await supabase.storage.from('member-photos').remove([decodeURIComponent(oldPath)])
    }
    const result = await uploadPhoto(supabase, id, photo)
    if ('error' in result) return { error: result.error }
    photoUrl = result.url
  }

  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase
    .from('members')
    .update({
      full_name: fullName,
      gender: gender || null,
      birth_date: birthDate,
      join_date: joinDate,
      badminton_start_date: badmintonStartDate || null,
      play_style: playStyle || null,
      practice_frequency: practiceFrequency,
      practice_days: practiceDays,
      ...(isAdmin && { registration_number: registrationNumber || null }),
      ...(isAdmin && { is_visible: isVisible }),
      ...(photoUrl !== undefined && { photo_url: photoUrl }),
    })
    .eq('id', id)

  if (error) return { error: 'メンバー情報の更新に失敗しました' }

  revalidatePath(`/members/${id}`)
  revalidatePath('/members')
  redirect(`/members/${id}`)
}

export async function toggleMemberVisibility(id: string, isVisible: boolean): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return

  await supabase.from('members').update({ is_visible: isVisible }).eq('id', id)
  revalidatePath('/members')
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

  const { data: member } = await supabase.from('members').select('photo_url').eq('id', id).single()
  if (member?.photo_url) {
    const path = member.photo_url.split('/member-photos/')[1]
    if (path) await supabase.storage.from('member-photos').remove([path])
  }

  await supabase.from('members').delete().eq('id', id)

  revalidatePath('/members')
  redirect('/members')
}
