'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type AnnouncementFormState = { error: string } | undefined

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase: null, error: '認証エラーが発生しました' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { supabase: null, error: '権限がありません' }

  return { supabase, error: null }
}

export async function createAnnouncement(
  _state: AnnouncementFormState,
  formData: FormData
): Promise<AnnouncementFormState> {
  const { supabase, error: authError } = await requireAdmin()
  if (authError || !supabase) return { error: authError! }

  const title = (formData.get('title') as string).trim()
  const content = (formData.get('content') as string).trim()
  const target = formData.get('target') as string || 'all'
  const publishStart = formData.get('publish_start') as string
  const publishEnd = formData.get('publish_end') as string

  if (!title || !content) return { error: 'タイトルと内容は必須です' }
  if (publishStart && publishEnd && publishStart > publishEnd) {
    return { error: '終了日は開始日より後の日付を設定してください' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.from('announcements').insert({
    title,
    content,
    target,
    publish_start: publishStart || null,
    publish_end: publishEnd || null,
    created_by: user!.id,
  })

  if (error) return { error: '連絡事項の登録に失敗しました' }

  revalidatePath('/announcements')
  redirect('/announcements')
}

export async function updateAnnouncement(
  id: string,
  _state: AnnouncementFormState,
  formData: FormData
): Promise<AnnouncementFormState> {
  const { supabase, error: authError } = await requireAdmin()
  if (authError || !supabase) return { error: authError! }

  const title = (formData.get('title') as string).trim()
  const content = (formData.get('content') as string).trim()
  const target = formData.get('target') as string || 'all'
  const publishStart = formData.get('publish_start') as string
  const publishEnd = formData.get('publish_end') as string

  if (!title || !content) return { error: 'タイトルと内容は必須です' }
  if (publishStart && publishEnd && publishStart > publishEnd) {
    return { error: '終了日は開始日より後の日付を設定してください' }
  }

  const { error } = await supabase
    .from('announcements')
    .update({
      title,
      content,
      target,
      publish_start: publishStart || null,
      publish_end: publishEnd || null,
    })
    .eq('id', id)

  if (error) return { error: '連絡事項の更新に失敗しました' }

  revalidatePath('/announcements')
  revalidatePath(`/announcements/${id}`)
  redirect(`/announcements/${id}`)
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const { supabase, error: authError } = await requireAdmin()
  if (authError || !supabase) return

  await supabase.from('announcements').delete().eq('id', id)

  revalidatePath('/announcements')
  redirect('/announcements')
}
