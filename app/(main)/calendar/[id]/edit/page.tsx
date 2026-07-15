import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Role, CalendarEvent, AccompanimentFeeSetting, Attachment } from '@/lib/types'
import EditEventForm from './EditEventForm'

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: event }, { data: fees }, { data: attachments }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user!.id).single(),
    supabase.from('events').select('*').eq('id', id).single(),
    supabase.from('accompaniment_fee_settings').select('*').order('amount_per_person'),
    supabase.from('attachments').select('*').eq('entity_type', 'event').eq('entity_id', id).order('created_at', { ascending: true }),
  ])

  if (!event) notFound()

  const role = profile?.role as Role
  const isAdminOrCoach = role === 'admin' || role === 'coach'
  const isOwner = event.created_by === user!.id

  if (!isOwner && !isAdminOrCoach) redirect(`/calendar/${id}`)

  // 終了後の予定は編集不可（全種別・全ユーザー共通）
  const now = new Date()
  const isPast = event.is_all_day
    ? now > new Date(`${new Date(event.end_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' })}T23:59:00+09:00`)
    : now > new Date(event.end_at)
  if (isPast) redirect(`/calendar/${id}`)

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-[#1A3666] mb-6">予定を編集</h1>
      <EditEventForm
        event={event as CalendarEvent}
        role={role}
        accompanimentFees={(fees ?? []) as AccompanimentFeeSetting[]}
        attachments={(attachments ?? []) as Attachment[]}
      />
    </div>
  )
}
