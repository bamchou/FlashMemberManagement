'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createEventComment(eventId: string, content: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラーが発生しました' }

  const trimmed = content.trim()
  if (!trimmed) return { error: 'コメントを入力してください' }

  const { error } = await supabase.from('event_comments').insert({
    event_id: eventId,
    user_id: user.id,
    content: trimmed,
  })

  if (error) return { error: 'コメントの投稿に失敗しました' }
  revalidatePath(`/calendar/${eventId}`)
  return {}
}

export async function updateEventComment(commentId: string, eventId: string, content: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラーが発生しました' }

  const trimmed = content.trim()
  if (!trimmed) return { error: 'コメントを入力してください' }

  const { error } = await supabase.from('event_comments')
    .update({ content: trimmed, updated_at: new Date().toISOString() })
    .eq('id', commentId)
    .eq('user_id', user.id)

  if (error) return { error: 'コメントの更新に失敗しました' }
  revalidatePath(`/calendar/${eventId}`)
  return {}
}

export async function deleteEventComment(commentId: string, eventId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('event_comments').delete().eq('id', commentId)
  revalidatePath(`/calendar/${eventId}`)
}
