import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EditAnnouncementForm from './EditAnnouncementForm'

export default async function EditAnnouncementPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: announcement }, { data: attachments }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user!.id).single(),
    supabase.from('announcements').select('*').eq('id', id).single(),
    supabase.from('attachments').select('*').eq('entity_type', 'announcement').eq('entity_id', id).order('created_at', { ascending: true }),
  ])

  if (profile?.role !== 'admin') redirect(`/announcements/${id}`)
  if (!announcement) notFound()

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#1A3666]">連絡事項を編集</h1>
      </div>

      <div className="bg-white rounded-xl border border-[#EAE0A8] p-6">
        <EditAnnouncementForm announcement={announcement} attachments={(attachments ?? []) as import('@/lib/types').Attachment[]} />
      </div>
    </div>
  )
}
