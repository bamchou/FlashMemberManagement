'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function generateCalendarToken(): Promise<{ token?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラー' }

  const admin = createAdminClient()

  // 既存トークンがあればそのまま返す
  const { data: existing } = await admin
    .from('calendar_tokens')
    .select('token')
    .eq('user_id', user.id)
    .maybeSingle()
  if (existing) return { token: existing.token }

  const { data, error } = await admin
    .from('calendar_tokens')
    .insert({ user_id: user.id })
    .select('token')
    .single()

  if (error || !data) return { error: 'トークンの生成に失敗しました' }
  revalidatePath('/calendar')
  return { token: data.token }
}

export async function revokeCalendarToken(): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラー' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('calendar_tokens')
    .delete()
    .eq('user_id', user.id)

  if (error) return { error: '連携解除に失敗しました' }
  revalidatePath('/calendar')
  return {}
}
