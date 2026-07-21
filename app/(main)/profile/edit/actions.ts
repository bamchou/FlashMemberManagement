'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function updateMyProfile(
  _state: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラーが発生しました' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return { error: '権限がありません' }

  const displayName = (formData.get('display_name') as string)?.trim() || null
  const displayNameKana = (formData.get('display_name_kana') as string)?.trim() || null
  const qualifications = (formData.get('qualifications') as string)?.trim() || null
  const birthDate = (formData.get('birth_date') as string) || null
  const badmintonStartDateRaw = (formData.get('badminton_start_date') as string) || null
  const badmintonStartDate = badmintonStartDateRaw ? `${badmintonStartDateRaw}-01` : null
  const photo = formData.get('photo') as File | null

  const admin = createAdminClient()

  // 写真アップロード
  let photoUrl: string | undefined = undefined
  if (photo && photo.size > 0) {
    const { data: current } = await admin.from('profiles').select('photo_url').eq('id', user.id).single()
    if (current?.photo_url) {
      const oldPath = current.photo_url.split('/member-photos/')[1]
      if (oldPath) await supabase.storage.from('member-photos').remove([decodeURIComponent(oldPath)])
    }
    const ext = photo.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `profiles/${user.id}.${ext}`
    const arrayBuffer = await photo.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from('member-photos')
      .upload(path, arrayBuffer, { upsert: true, contentType: photo.type || 'image/jpeg' })
    if (uploadError) return { error: `写真のアップロードに失敗しました: ${uploadError.message}` }
    const { data: { publicUrl } } = supabase.storage.from('member-photos').getPublicUrl(path)
    photoUrl = publicUrl
  }

  const { error } = await admin.from('profiles').update({
    display_name: displayName,
    display_name_kana: displayNameKana,
    qualifications,
    birth_date: birthDate,
    badminton_start_date: badmintonStartDate,
    ...(photoUrl !== undefined && { photo_url: photoUrl }),
  }).eq('id', user.id)

  if (error) return { error: 'プロフィールの更新に失敗しました' }

  revalidatePath('/profile')
  redirect('/profile')
}
