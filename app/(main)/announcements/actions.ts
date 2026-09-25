'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendAnnouncementPush } from '@/lib/push/announcements'
import { safeReturnTo } from '@/lib/returnTo'

export type AnnouncementFormState = { error: string } | undefined

// datetime-local の値 (YYYY-MM-DDTHH:MM) を JST として UTC ISO に変換
function jstToISO(dtLocal: string): string | null {
  if (!dtLocal) return null
  return new Date(dtLocal.slice(0, 16) + ':00+09:00').toISOString()
}

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
  const announcementType = formData.get('announcement_type') as string || 'normal'
  const publishStart = formData.get('publish_start') as string
  const publishEnd = formData.get('publish_end') as string
  const entryDeadline = (formData.get('entry_deadline') as string)?.trim() || null
  const notifyOnPost = formData.get('notify_on_post') !== null
  const notifyAt = jstToISO(formData.get('notify_at') as string)

  if (!title || !content) return { error: 'タイトルと内容は必須です' }
  if (publishStart && publishEnd && publishStart > publishEnd) {
    return { error: '終了日は開始日より後の日付を設定してください' }
  }

  const { data: newAnn, error } = await supabase.from('announcements').insert({
    title,
    content,
    target,
    announcement_type: announcementType,
    publish_start: publishStart || null,
    publish_end: publishEnd || null,
    entry_deadline: entryDeadline,
    notify_on_post: notifyOnPost,
    notify_at: notifyAt,
    created_by: user.id,
  }).select('id').single()

  if (error || !newAnn) return { error: 'お知らせの登録に失敗しました' }

  const files = formData.getAll('attachments')
  const uploadErr = await uploadFiles(supabase, 'announcement', newAnn.id, files, user.id)
  if (uploadErr) return { error: uploadErr }

  // 登録時通知（チェックON時）。失敗してもcronが後で拾うため握りつぶす。
  if (notifyOnPost) {
    try {
      await sendAnnouncementPush(newAnn.id, 'posted')
    } catch (e) {
      console.error('[createAnnouncement] push error:', e)
    }
  }

  revalidatePath('/announcements')
  redirect(safeReturnTo(formData.get('return_to'), '/announcements', '/announcements'))
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
  const announcementType = formData.get('announcement_type') as string || 'normal'
  const publishStart = formData.get('publish_start') as string
  const publishEnd = formData.get('publish_end') as string
  const entryDeadline = (formData.get('entry_deadline') as string)?.trim() || null
  const notifyAt = jstToISO(formData.get('notify_at') as string)

  if (!title || !content) return { error: 'タイトルと内容は必須です' }
  if (publishStart && publishEnd && publishStart > publishEnd) {
    return { error: '終了日は開始日より後の日付を設定してください' }
  }

  // 編集では通知を送らない。notify_at は保存し、予約通知(cron)側で反映される。
  const { error } = await supabase
    .from('announcements')
    .update({
      title,
      content,
      target,
      announcement_type: announcementType,
      publish_start: publishStart || null,
      publish_end: publishEnd || null,
      entry_deadline: entryDeadline,
      notify_at: notifyAt,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: 'お知らせの更新に失敗しました' }

  const files = formData.getAll('attachments')
  const uploadErr = await uploadFiles(supabase, 'announcement', id, files, user.id)
  if (uploadErr) return { error: uploadErr }

  revalidatePath('/announcements')
  revalidatePath(`/announcements/${id}`)
  // 詳細に入る直前に見ていた一覧（タブ）へ戻る
  redirect(safeReturnTo(formData.get('return_to'), '/announcements', '/announcements'))
}

// お知らせを既読にする（全ロール可）。新規に既読化したときのみ newlyRead=true。
export async function markAnnouncementRead(announcementId: string): Promise<{ newlyRead: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { newlyRead: false }

  const { data: existing } = await supabase
    .from('announcement_reads')
    .select('id')
    .eq('announcement_id', announcementId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (existing) return { newlyRead: false }

  const { error } = await supabase
    .from('announcement_reads')
    .insert({ announcement_id: announcementId, user_id: user.id })
  return { newlyRead: !error }
}

export async function togglePin(id: string, isPinned: boolean): Promise<void> {
  const { supabase, error: authError } = await requireAdmin()
  if (authError || !supabase) return

  await supabase.from('announcements').update({ is_pinned: isPinned }).eq('id', id)
  revalidatePath('/announcements')
  revalidatePath(`/announcements/${id}`)
}

export async function deleteAnnouncement(id: string, returnTo?: string): Promise<void> {
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
  redirect(safeReturnTo(returnTo, '/announcements', '/announcements'))
}
