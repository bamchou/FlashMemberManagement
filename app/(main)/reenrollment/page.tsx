import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ReenrollmentForm from './_components/ReenrollmentForm'

export default async function ReenrollmentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('pending_reenrollment')
    .eq('id', user!.id)
    .single()

  if (!profile?.pending_reenrollment) redirect('/members')

  const admin = createAdminClient()
  const { data: members } = await admin
    .from('members')
    .select('id, full_name, birth_date')
    .eq('guardian_id', user!.id)
    .not('withdrawn_at', 'is', null)
    .order('birth_date', { ascending: true })
    .order('join_date', { ascending: true })

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#1A3666]">再入会 — お子様の選択</h1>
        <p className="text-sm text-gray-500 mt-1">
          再入会させるお子様を選択してください。戦績などこれまでの情報はそのまま引き継がれます。
        </p>
      </div>
      <ReenrollmentForm
        members={(members ?? []).map(m => ({
          id: m.id,
          name: m.full_name,
          birthDate: m.birth_date,
        }))}
      />
    </div>
  )
}
