import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MemberForm from './MemberForm'

export default async function NewMemberPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  if (profile?.role !== 'admin' && profile?.role !== 'member') redirect('/members')

  const isAdmin = profile?.role === 'admin'

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#1A3666]">メンバー登録</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {isAdmin ? '新しいメンバーの情報を入力してください' : 'お子様の情報を入力してください'}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-[#EAE0A8] p-6">
        <MemberForm isAdmin={isAdmin} />
      </div>
    </div>
  )
}
