'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function deleteAttachment(
  id: string,
  storagePath: string,
  entityType: 'event' | 'announcement',
  entityId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラーが発生しました' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: '権限がありません' }

  const adminSupabase = createAdminClient()
  await adminSupabase.storage.from('attachments').remove([storagePath])
  await supabase.from('attachments').delete().eq('id', id)

  if (entityType === 'announcement') {
    revalidatePath(`/announcements/${entityId}`)
    revalidatePath(`/announcements/${entityId}/edit`)
  } else {
    revalidatePath(`/calendar/${entityId}`)
    revalidatePath(`/calendar/${entityId}/edit`)
  }
  return {}
}
