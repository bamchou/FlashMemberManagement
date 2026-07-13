import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EditMemberForm from './EditMemberForm'

export default async function EditMemberPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: member }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user!.id).single(),
    supabase.from('members').select('*').eq('id', id).single(),
  ])

  if (!member) notFound()

  const isAdmin = profile?.role === 'admin'
  const isGuardianOfMember = profile?.role === 'member' && member.guardian_id === user!.id

  if (!isAdmin && !isGuardianOfMember) redirect(`/members/${id}`)

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#1A3666]">メンバー情報を編集</h1>
        <p className="text-sm text-gray-500 mt-0.5">{member.full_name}</p>
      </div>

      <div className="bg-white rounded-xl border border-[#EAE0A8] p-6">
        <EditMemberForm member={member} isAdmin={isAdmin} />
      </div>
    </div>
  )
}
