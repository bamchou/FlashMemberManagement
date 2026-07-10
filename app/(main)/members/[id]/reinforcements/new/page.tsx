import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ReinforcementForm from './ReinforcementForm'

export default async function NewReinforcementPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: member }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user!.id).single(),
    supabase.from('members').select('full_name').eq('id', id).single(),
  ])

  if (profile?.role !== 'admin') redirect(`/members/${id}`)
  if (!member) notFound()

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#1A3666]">県強化選手選出を登録</h1>
        <p className="text-sm text-gray-500 mt-0.5">{member.full_name}</p>
      </div>

      <div className="bg-white rounded-xl border border-[#EAE0A8] p-6">
        <ReinforcementForm memberId={id} />
      </div>
    </div>
  )
}
