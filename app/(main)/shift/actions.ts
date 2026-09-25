'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// 管理者: 練習の「参加要請」フラグを切り替え
export async function toggleCoachWanted(eventId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラー' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: '権限がありません' }

  const admin = createAdminClient()
  const { data: event } = await admin.from('events').select('needs_coach, event_type').eq('id', eventId).single()
  if (!event) return { error: '予定が見つかりません' }
  if (event.event_type !== 'practice') return { error: '練習のみ設定できます' }

  const { error } = await admin.from('events').update({ needs_coach: !event.needs_coach }).eq('id', eventId)
  if (error) return { error: '更新に失敗しました' }

  revalidatePath('/shift/coach')
  revalidatePath('/calendar')
  revalidatePath(`/calendar/${eventId}`)
  return {}
}

// コーチ/管理者: 自分の参加可否を設定（available=参加可 / unavailable=参加不可 / none=未回答に戻す）
// available は通常カレンダーの「参加予定コーチ」に反映される
export async function setCoachAvailability(
  eventId: string,
  status: 'available' | 'unavailable' | 'none',
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラー' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach' && profile?.role !== 'admin') return { error: '権限がありません' }

  const admin = createAdminClient()

  if (status === 'none') {
    const { error } = await admin
      .from('event_coach_attendances')
      .delete()
      .eq('event_id', eventId)
      .eq('coach_id', user.id)
    if (error) return { error: '更新に失敗しました' }
  } else {
    const { data: existing } = await admin
      .from('event_coach_attendances')
      .select('id')
      .eq('event_id', eventId)
      .eq('coach_id', user.id)
      .maybeSingle()
    if (existing) {
      const { error } = await admin
        .from('event_coach_attendances')
        .update({ status })
        .eq('event_id', eventId)
        .eq('coach_id', user.id)
      if (error) return { error: '更新に失敗しました' }
    } else {
      const { error } = await admin
        .from('event_coach_attendances')
        .insert({ event_id: eventId, coach_id: user.id, status })
      if (error) return { error: '更新に失敗しました' }
    }
  }

  revalidatePath('/shift/coach')
  revalidatePath('/calendar')
  revalidatePath(`/calendar/${eventId}`)
  return {}
}
