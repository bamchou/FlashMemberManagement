'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { EventType } from '@/lib/types'

const VALID_EVENT_TYPES = ['practice', 'tournament', 'event', 'social', 'other']
const VALID_TARGETS = ['all', 'coach', 'member']

// datetime-local の値 (YYYY-MM-DDTHH:MM または YYYY-MM-DDTHH:MM:SS) を JST として UTC ISO に変換
function jstToISO(dtLocal: string): string {
  const base = dtLocal.slice(0, 16) // 秒以下を除去して "YYYY-MM-DDTHH:MM" に統一
  return new Date(base + ':00+09:00').toISOString()
}

export type EventFormState = { error: string } | undefined

export async function createEvent(formData: FormData): Promise<EventFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラーが発生しました' }

  const title = (formData.get('title') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const event_type = formData.get('event_type') as string
  const target = formData.get('target') as string
  const start_at_raw = formData.get('start_at') as string
  const end_at_raw = formData.get('end_at') as string

  if (!title) return { error: 'タイトルを入力してください' }
  if (!VALID_EVENT_TYPES.includes(event_type)) return { error: '予定の種類を選択してください' }
  if (!VALID_TARGETS.includes(target)) return { error: '対象を選択してください' }
  if (!start_at_raw) return { error: '開始日時を入力してください' }
  if (!end_at_raw) return { error: '終了日時を入力してください' }

  const start_at = jstToISO(start_at_raw)
  const end_at = jstToISO(end_at_raw)

  if (new Date(end_at) <= new Date(start_at)) return { error: '終了日時は開始日時より後にしてください' }

  const { error } = await supabase.from('events').insert({
    title,
    description,
    event_type: event_type as EventType,
    target,
    start_at,
    end_at,
    created_by: user.id,
  })

  if (error) return { error: '予定の登録に失敗しました' }

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
  const start_at_raw = formData.get('start_at') as string
  const end_at_raw = formData.get('end_at') as string

  if (!title) return { error: 'タイトルを入力してください' }
  if (!VALID_EVENT_TYPES.includes(event_type)) return { error: '予定の種類を選択してください' }
  if (!VALID_TARGETS.includes(target)) return { error: '対象を選択してください' }
  if (!start_at_raw) return { error: '開始日時を入力してください' }
  if (!end_at_raw) return { error: '終了日時を入力してください' }

  const start_at = jstToISO(start_at_raw)
  const end_at = jstToISO(end_at_raw)

  if (new Date(end_at) <= new Date(start_at)) return { error: '終了日時は開始日時より後にしてください' }

  const { error } = await supabase.from('events').update({
    title,
    description,
    event_type: event_type as EventType,
    target,
    start_at,
    end_at,
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  if (error) return { error: '予定の更新に失敗しました' }

  revalidatePath('/calendar')
  revalidatePath(`/calendar/${id}`)
  redirect(`/calendar/${id}`)
}

export async function deleteEvent(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('events').delete().eq('id', id)
  revalidatePath('/calendar')
  redirect('/calendar')
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
