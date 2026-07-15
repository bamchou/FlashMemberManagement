'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type AnnouncementFormState = { error: string } | undefined

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase: null, user: null, error: '認証エラーが発生しました' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { supabase: null, user: null, error: '権限がありません' }

  return { supabase, user, error: null }
}

async function uploadFiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entityType: 'event' | 'announcement',
  entityId: string,
  files: FormDataEntryValue[],
  userId: string,
): Promise<string | null> {
  const validEntries = files.filter(e => typeof e !== 'string' && e.size > 0)
  if (validEntries.length === 0) return null

  const adminSupabase = createAdminClient()

  for (const entry of validEntries) {
    const file = entry as File
    const fileName = file.name ?? 'attachment'
    const ext = fileName.split('.').pop()?.toLowerCase() ?? 'bin'
    const path = `${entityType}s/${entityId}/${Date.now()}.${ext}`
    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadError } = await adminSupabase.storage
      .from('attachments')
      .upload(path, arrayBuffer, { contentType: file.type || 'application/octet-stream' })
    if (uploadError) {
      console.error('[uploadFiles] storage upload error:', uploadError)
      return `ファイル「${fileName}」のアップロードに失敗しました: ${uploadError.message}`
    }
    const { data: { publicUrl } } = adminSupabase.storage.from('attachments').getPublicUrl(path)
    const { error: dbError } = await supabase.from('attachments').insert({
      entity_type: entityType,
      entity_id: entityId,
      file_name: fileName,
      storage_path: path,
      file_url: publicUrl,
      file_size: file.size,
      created_by: userId,
    })
    if (dbError) {
      console.error('[uploadFiles] db insert error:', dbError)
      return `添付ファイルの保存に失敗しました: ${dbError.message}`
    }
  }
  return null
}

export async function createAnnouncement(
  _state: AnnouncementFormState,
  formData: FormData
): Promise<AnnouncementFormState> {
  const { supabase, user, error: authError } = await requireAdmin()
  if (authError || !supabase || !user) return { error: authError! }

  const title = (formData.get('title') as string).trim()
  const content = (formData.get('content') as string).trim()
  const target = formData.get('target') as string || 'all'
  const publishStart = formData.get('publish_start') as string
  const publishEnd = formData.get('publish_end') as string

  if (!title || !content) return { error: 'タイトルと内容は必須です' }
  if (publishStart && publishEnd && publishStart > publishEnd) {
    return { error: '終了日は開始日より後の日付を設定してください' }
  }

  const { data: newAnn, error } = await supabase.from('announcements').insert({
    title,
    content,
    target,
    publish_start: publishStart || null,
    publish_end: publishEnd || null,
    created_by: user.id,
  }).select('id').single()

  if (error || !newAnn) return { error: '連絡事項の登録に失敗しました' }

  const files = formData.getAll('attachments')
  const uploadErr = await uploadFiles(supabase, 'announcement', newAnn.id, files, user.id)
  if (uploadErr) return { error: uploadErr }

  revalidatePath('/announcements')
  redirect('/announcements')
}

export async function updateAnnouncement(
  id: string,
  _state: AnnouncementFormState,
  formData: FormData
): Promise<AnnouncementFormState> {
  const { supabase, user, error: authError } = await requireAdmin()
  if (authError || !supabase || !user) return { error: authError! }

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

  const files = formData.getAll('attachments')
  const uploadErr = await uploadFiles(supabase, 'announcement', id, files, user.id)
  if (uploadErr) return { error: uploadErr }

  revalidatePath('/announcements')
  revalidatePath(`/announcements/${id}`)
  redirect(`/announcements/${id}`)
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const { supabase, error: authError } = await requireAdmin()
  if (authError || !supabase) return

  const adminSupabase = createAdminClient()
  const { data: atts } = await supabase
    .from('attachments')
    .select('storage_path')
    .eq('entity_type', 'announcement')
    .eq('entity_id', id)
  if (atts && atts.length > 0) {
    await adminSupabase.storage.from('attachments').remove(atts.map((a: { storage_path: string }) => a.storage_path))
    await supabase.from('attachments').delete().eq('entity_type', 'announcement').eq('entity_id', id)
  }

  await supabase.from('announcements').delete().eq('id', id)

  revalidatePath('/announcements')
  redirect('/announcements')
}
