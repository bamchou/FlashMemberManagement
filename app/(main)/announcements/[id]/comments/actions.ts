'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createComment(announcementId: string, content: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラーが発生しました' }

  const trimmed = content.trim()
  if (!trimmed) return { error: 'コメントを入力してください' }

  const { error } = await supabase.from('announcement_comments').insert({
    announcement_id: announcementId,
    user_id: user.id,
    content: trimmed,
  })

  if (error) return { error: 'コメントの投稿に失敗しました' }
  revalidatePath(`/announcements/${announcementId}`)
  return {}
}

export async function updateComment(commentId: string, announcementId: string, content: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラーが発生しました' }

  const trimmed = content.trim()
  if (!trimmed) return { error: 'コメントを入力してください' }

  const { error } = await supabase.from('announcement_comments')
    .update({ content: trimmed, updated_at: new Date().toISOString() })
    .eq('id', commentId)
    .eq('user_id', user.id)

  if (error) return { error: 'コメントの更新に失敗しました' }
  revalidatePath(`/announcements/${announcementId}`)
  return {}
}

export async function deleteComment(commentId: string, announcementId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('announcement_comments').delete().eq('id', commentId)
  revalidatePath(`/announcements/${announcementId}`)
}

export async function toggleCommentVisibility(commentId: string, announcementId: string, isVisible: boolean): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return

  await supabase.from('announcement_comments').update({ is_visible: isVisible }).eq('id', commentId)
  revalidatePath(`/announcements/${announcementId}`)
}
