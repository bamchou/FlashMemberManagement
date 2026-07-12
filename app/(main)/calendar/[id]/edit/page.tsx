import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Role, CalendarEvent, AccompanimentFeeSetting } from '@/lib/types'
import EditEventForm from './EditEventForm'

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: event }, { data: fees }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user!.id).single(),
    supabase.from('events').select('*').eq('id', id).single(),
    supabase.from('accompaniment_fee_settings').select('*').order('amount_per_person'),
  ])

  if (!event) notFound()

  const role = profile?.role as Role
  const isAdminOrCoach = role === 'admin' || role === 'coach'
  const isOwner = event.created_by === user!.id

  if (!isOwner && !isAdminOrCoach) redirect('/calendar')

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-[#1A3666] mb-6">予定を編集</h1>
      <EditEventForm
        event={event as CalendarEvent}
        role={role}
        accompanimentFees={(fees ?? []) as AccompanimentFeeSetting[]}
      />
    </div>
  )
}
