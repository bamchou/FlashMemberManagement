import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EditUserForm from './EditUserForm'

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: target }, { count: adminCount }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user!.id).single(),
    supabase.from('profiles').select('id, username, display_name, role, photo_url, birth_date, badminton_start_date, show_on_members_page').eq('id', id).single(),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
  ])

  if (profile?.role !== 'admin') redirect('/users')
  if (!target) notFound()

  const roleChangeLocked = target.role === 'admin' && (adminCount ?? 0) <= 1

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#1A3666]">ユーザーを編集</h1>
        <p className="text-sm text-gray-500 mt-0.5">{target.username}</p>
      </div>

      <div className="bg-white rounded-xl border border-[#EAE0A8] p-6">
        <EditUserForm
          userId={target.id}
          initialUsername={target.username ?? ''}
          initialDisplayName={target.display_name ?? ''}
          initialRole={target.role}
          initialPhotoUrl={target.photo_url ?? null}
          initialBirthDate={target.birth_date ?? ''}
          initialBadmintonStartDate={target.badminton_start_date ?? ''}
          initialShowOnMembersPage={target.show_on_members_page ?? false}
          roleChangeLocked={roleChangeLocked}
        />
      </div>
    </div>
  )
}
