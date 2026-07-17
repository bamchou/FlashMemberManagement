'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { EventType } from '@/lib/types'

const VALID_EVENT_TYPES = ['practice', 'tournament', 'event', 'social', 'other']
const VALID_TARGETS = ['all', 'coach', 'member']

// datetime-local の値 (YYYY-MM-DDTHH:MM または YYYY-MM-DDTHH:MM:SS) を JST として UTC ISO に変換
function jstToISO(dtLocal: string): string {
  const base = dtLocal.slice(0, 16)
  return new Date(base + ':00+09:00').toISOString()
}

// 日付のみ (YYYY-MM-DD) を JST の開始/終了として UTC ISO に変換
function jstDateToISO(dateStr: string, endOfDay = false): string {
  const time = endOfDay ? 'T23:59:59' : 'T00:00:00'
  return new Date(dateStr + time + '+09:00').toISOString()
}

export type EventFormState = { error: string } | undefined

async function uploadAttachmentFiles(
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
      console.error('[uploadAttachmentFiles] storage upload error:', uploadError)
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
      console.error('[uploadAttachmentFiles] db insert error:', dbError)
      return `添付ファイルの保存に失敗しました: ${dbError.message}`
    }
  }
  return null
}

export async function createEvent(formData: FormData): Promise<EventFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラーが発生しました' }

  const title = (formData.get('title') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const event_type = formData.get('event_type') as string
  const target = formData.get('target') as string
  const is_all_day = formData.get('is_all_day') === 'true'
  const start_at_raw = formData.get('start_at') as string
  const end_at_raw = formData.get('end_at') as string

  if (!title) return { error: 'タイトルを入力してください' }
  if (!VALID_EVENT_TYPES.includes(event_type)) return { error: '予定の種類を選択してください' }
  if (!VALID_TARGETS.includes(target)) return { error: '対象を選択してください' }
  if (!start_at_raw) return { error: is_all_day ? '開始日を入力してください' : '開始日時を入力してください' }
  if (!end_at_raw) return { error: is_all_day ? '終了日を入力してください' : '終了日時を入力してください' }

  let start_at: string
  let end_at: string
  if (is_all_day) {
    start_at = jstDateToISO(start_at_raw)
    end_at   = jstDateToISO(end_at_raw, true)
    if (end_at_raw < start_at_raw) return { error: '終了日は開始日以降にしてください' }
  } else {
    start_at = jstToISO(start_at_raw)
    end_at   = jstToISO(end_at_raw)
    if (new Date(end_at) <= new Date(start_at)) return { error: '終了日時は開始日時より後にしてください' }
  }

  // 練習は仮登録スタート、その他は確定
  const status = event_type === 'practice' ? 'provisional' : 'confirmed'

  // 大会固有フィールド
  const venue = event_type === 'tournament'
    ? ((formData.get('venue') as string)?.trim() || null)
    : null
  const entry_deadline = event_type === 'tournament'
    ? ((formData.get('entry_deadline') as string)?.trim() || null)
    : null

  // 大会参加費
  let singles_fee: number | null = null
  let doubles_fee: number | null = null
  let accompaniment_type: string | null = null
  if (event_type === 'tournament') {
    if (formData.get('singles_fee_mode') === 'amount') {
      const val = formData.get('singles_fee') as string
      if (!val || isNaN(parseInt(val, 10)) || parseInt(val, 10) <= 0)
        return { error: 'シングルス参加費の金額を正しく入力してください' }
      singles_fee = parseInt(val, 10)
    }
    if (formData.get('doubles_fee_mode') === 'amount') {
      const val = formData.get('doubles_fee') as string
      if (!val || isNaN(parseInt(val, 10)) || parseInt(val, 10) <= 0)
        return { error: 'ダブルス参加費の金額を正しく入力してください' }
      doubles_fee = parseInt(val, 10)
    }
    accompaniment_type = (formData.get('accompaniment_type') as string) || null
  }

  // 帯同費をマスタから取得してスナップショット保存
  let accompaniment_fee_per_person: number | null = null
  if (accompaniment_type) {
    const { data: feeRow } = await supabase
      .from('accompaniment_fee_settings')
      .select('amount_per_person')
      .eq('area_type', accompaniment_type)
      .single()
    accompaniment_fee_per_person = feeRow?.amount_per_person ?? null
  }

  const { data: newEvent, error } = await supabase.from('events').insert({
    title, description,
    event_type: event_type as EventType,
    target, start_at, end_at, status,
    is_all_day, venue, singles_fee, doubles_fee,
    accompaniment_type, accompaniment_fee_per_person,
    entry_deadline,
    created_by: user.id,
  }).select('id').single()

  if (error || !newEvent) return { error: '予定の登録に失敗しました' }

  const files = formData.getAll('attachments')
  const uploadErr = await uploadAttachmentFiles(supabase, 'event', newEvent.id, files, user.id)
  if (uploadErr) return { error: uploadErr }

  revalidatePath('/calendar')
  redirect('/calendar')
}

export async function updateEvent(id: string, formData: FormData): Promise<EventFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラーが発生しました' }

  const title = (formData.get('title') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const event_type = formData.get('event_type') as string
  const target = formData.get('target') as string
  const is_all_day = formData.get('is_all_day') === 'true'
  const start_at_raw = formData.get('start_at') as string
  const end_at_raw = formData.get('end_at') as string

  if (!title) return { error: 'タイトルを入力してください' }
  if (!VALID_EVENT_TYPES.includes(event_type)) return { error: '予定の種類を選択してください' }
  if (!VALID_TARGETS.includes(target)) return { error: '対象を選択してください' }
  if (!start_at_raw) return { error: is_all_day ? '開始日を入力してください' : '開始日時を入力してください' }
  if (!end_at_raw) return { error: is_all_day ? '終了日を入力してください' : '終了日時を入力してください' }

  let start_at: string
  let end_at: string
  if (is_all_day) {
    start_at = jstDateToISO(start_at_raw)
    end_at   = jstDateToISO(end_at_raw, true)
    if (end_at_raw < start_at_raw) return { error: '終了日は開始日以降にしてください' }
  } else {
    start_at = jstToISO(start_at_raw)
    end_at   = jstToISO(end_at_raw)
    if (new Date(end_at) <= new Date(start_at)) return { error: '終了日時は開始日時より後にしてください' }
  }

  const status_raw = formData.get('status') as string | null
  const status = status_raw === 'provisional' || status_raw === 'confirmed'
    ? status_raw
    : 'confirmed'

  const payment_has_amount = formData.get('payment_has_amount') === 'true'
  const payment_method = payment_has_amount ? ((formData.get('payment_method') as string | null) || null) : null
  const payment_amount_raw = payment_has_amount ? (formData.get('payment_amount') as string | null) : null
  const payment_amount = payment_amount_raw ? parseInt(payment_amount_raw, 10) : null

  // 練習の確定かつ支払金額ありの場合のみ決済情報を検証
  if (event_type === 'practice' && status === 'confirmed' && payment_has_amount) {
    if (!payment_method) return { error: '決済方法を選択してください' }
    if (!payment_amount_raw || isNaN(payment_amount!)) return { error: '支払い金額を入力してください' }
    if (payment_amount! <= 0) return { error: '支払い金額は1円以上で入力してください' }
  }

  // 大会固有フィールド
  const venue = event_type === 'tournament'
    ? ((formData.get('venue') as string)?.trim() || null)
    : null
  const entry_deadline = event_type === 'tournament'
    ? ((formData.get('entry_deadline') as string)?.trim() || null)
    : null

  // 大会参加費
  let singles_fee: number | null = null
  let doubles_fee: number | null = null
  let accompaniment_type: string | null = null
  if (event_type === 'tournament') {
    if (formData.get('singles_fee_mode') === 'amount') {
      const val = formData.get('singles_fee') as string
      if (!val || isNaN(parseInt(val, 10)) || parseInt(val, 10) <= 0)
        return { error: 'シングルス参加費の金額を正しく入力してください' }
      singles_fee = parseInt(val, 10)
    }
    if (formData.get('doubles_fee_mode') === 'amount') {
      const val = formData.get('doubles_fee') as string
      if (!val || isNaN(parseInt(val, 10)) || parseInt(val, 10) <= 0)
        return { error: 'ダブルス参加費の金額を正しく入力してください' }
      doubles_fee = parseInt(val, 10)
    }
    accompaniment_type = (formData.get('accompaniment_type') as string) || null
  }

  // 帯同費をマスタから取得してスナップショット保存
  let accompaniment_fee_per_person: number | null = null
  if (event_type === 'tournament' && accompaniment_type) {
    const { data: feeRow } = await supabase
      .from('accompaniment_fee_settings')
      .select('amount_per_person')
      .eq('area_type', accompaniment_type)
      .single()
    accompaniment_fee_per_person = feeRow?.amount_per_person ?? null
  }

  const { error } = await supabase.from('events').update({
    title, description,
    event_type: event_type as EventType,
    target, start_at, end_at, status, is_all_day,
    payment_method: event_type === 'practice' && status === 'confirmed' ? payment_method : null,
    payment_amount: event_type === 'practice' && status === 'confirmed' ? payment_amount : null,
    venue, singles_fee, doubles_fee,
    accompaniment_type, accompaniment_fee_per_person,
    entry_deadline,
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  if (error) return { error: '予定の更新に失敗しました' }

  const files = formData.getAll('attachments')
  const uploadErr = await uploadAttachmentFiles(supabase, 'event', id, files, user.id)
  if (uploadErr) return { error: uploadErr }

  revalidatePath('/calendar')
  revalidatePath(`/calendar/${id}`)
  redirect('/calendar')
}

export async function deleteEvent(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const adminForDelete = createAdminClient()
  const { data: atts } = await supabase
    .from('attachments')
    .select('storage_path')
    .eq('entity_type', 'event')
    .eq('entity_id', id)
  if (atts && atts.length > 0) {
    await adminForDelete.storage.from('attachments').remove(atts.map((a: { storage_path: string }) => a.storage_path))
    await supabase.from('attachments').delete().eq('entity_type', 'event').eq('entity_id', id)
  }

  await supabase.from('events').delete().eq('id', id)
  revalidatePath('/calendar')
  redirect('/calendar')
}

const VALID_PARTICIPATION_CATEGORIES = ['singles', 'doubles', 'both']

export async function addParticipant(
  eventId: string,
  memberId: string,
  category?: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラー' }

  // 大会は承認待ち、それ以外は即承認
  const { data: event } = await supabase
    .from('events')
    .select('event_type, singles_fee, doubles_fee, accompaniment_fee_per_person, entry_deadline')
    .eq('id', eventId)
    .single()
  const isTournament = event?.event_type === 'tournament'

  // 申込締切日チェック（管理者・指導者は除外）
  if (isTournament && event?.entry_deadline) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin' && profile?.role !== 'coach') {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' })
      if (today > event.entry_deadline) {
        return { error: '申込締切日を過ぎているため、参加登録できません' }
      }
    }
  }

  const approval_status = isTournament ? 'pending' : 'approved'

  const effectiveCategory = isTournament ? (category ?? 'singles') : null
  if (isTournament && effectiveCategory && !VALID_PARTICIPATION_CATEGORIES.includes(effectiveCategory)) {
    return { error: '参加種目の値が無効です' }
  }

  // 大会の場合は参加費スナップショットを計算して保存
  let fee_snapshot: number | null = null
  if (isTournament && effectiveCategory && event) {
    let entryFee = 0
    if (effectiveCategory === 'singles') entryFee = event.singles_fee ?? 0
    else if (effectiveCategory === 'doubles') entryFee = event.doubles_fee ?? 0
    else if (effectiveCategory === 'both') entryFee = (event.singles_fee ?? 0) + (event.doubles_fee ?? 0)
    fee_snapshot = entryFee + (event.accompaniment_fee_per_person ?? 0)
  }

  const { error } = await supabase
    .from('event_participants')
    .insert({
      event_id: eventId,
      member_id: memberId,
      registered_by: user.id,
      approval_status,
      participation_category: effectiveCategory,
      fee_snapshot,
    })

  if (error) return { error: '参加登録に失敗しました' }
  revalidatePath(`/calendar/${eventId}`)
  return {}
}

export async function approveParticipant(eventId: string, memberId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラー' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'coach') return { error: '権限がありません' }

  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase
    .from('event_participants')
    .update({ approval_status: 'approved' })
    .eq('event_id', eventId)
    .eq('member_id', memberId)

  if (error) return { error: '承認に失敗しました' }
  revalidatePath(`/calendar/${eventId}`)
  return {}
}

export async function unapproveParticipant(eventId: string, memberId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラー' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'coach') return { error: '権限がありません' }

  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase
    .from('event_participants')
    .update({ approval_status: 'pending' })
    .eq('event_id', eventId)
    .eq('member_id', memberId)

  if (error) return { error: '承認取消に失敗しました' }
  revalidatePath(`/calendar/${eventId}`)
  return {}
}

export async function rejectParticipant(eventId: string, memberId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラー' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'coach') return { error: '権限がありません' }

  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase
    .from('event_participants')
    .delete()
    .eq('event_id', eventId)
    .eq('member_id', memberId)

  if (error) return { error: '参加希望取消に失敗しました' }
  revalidatePath(`/calendar/${eventId}`)
  return {}
}

export async function removeParticipant(eventId: string, memberId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラー' }

  const { error } = await supabase
    .from('event_participants')
    .delete()
    .eq('event_id', eventId)
    .eq('member_id', memberId)

  if (error) return { error: '参加取り消しに失敗しました' }
  revalidatePath(`/calendar/${eventId}`)
  return {}
}

export async function toggleCoachAttendance(eventId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラー' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach' && profile?.role !== 'admin') return { error: '権限がありません' }

  const adminSupabase = createAdminClient()

  const { data: existing } = await adminSupabase
    .from('event_coach_attendances')
    .select('id')
    .eq('event_id', eventId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (existing) {
    const { error } = await adminSupabase
      .from('event_coach_attendances')
      .delete()
      .eq('event_id', eventId)
      .eq('coach_id', user.id)
    if (error) return { error: '取消に失敗しました' }
  } else {
    const { error } = await adminSupabase
      .from('event_coach_attendances')
      .insert({ event_id: eventId, coach_id: user.id })
    if (error) return { error: '参加登録に失敗しました' }
  }

  revalidatePath(`/calendar/${eventId}`)
  return {}
}

export async function toggleEventVisibility(id: string, isVisible: boolean): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'coach') return

  await supabase.from('events').update({ is_visible: isVisible }).eq('id', id)
  revalidatePath('/calendar')
  revalidatePath(`/calendar/${id}`)
}
