import { createClient } from '@/lib/supabase/server'
import EventForm from './EventForm'
import type { AccompanimentFeeSetting } from '@/lib/types'

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const { date } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const [{ data: profile }, { data: fees }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user!.id).single(),
    supabase.from('accompaniment_fee_settings').select('*').order('amount_per_person'),
  ])

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-[#1A3666] mb-6">予定を追加</h1>
      <EventForm
        role={profile?.role ?? 'member'}
        defaultDate={date}
        accompanimentFees={(fees ?? []) as AccompanimentFeeSetting[]}
      />
    </div>
  )
}
