import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AnnouncementForm from './AnnouncementForm'

export default async function NewAnnouncementPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  if (profile?.role !== 'admin') redirect('/announcements')

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#1A3666]">連絡事項を作成</h1>
      </div>

      <div className="bg-white rounded-xl border border-[#EAE0A8] p-6">
        <AnnouncementForm />
      </div>
    </div>
  )
}
