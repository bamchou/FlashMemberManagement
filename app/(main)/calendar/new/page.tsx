import { createClient } from '@/lib/supabase/server'
import EventForm from './EventForm'

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const { date } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-[#1A3666] mb-6">予定を追加</h1>
      <EventForm role={profile?.role ?? 'member'} defaultDate={date} />
    </div>
  )
}
