import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import UserForm from './UserForm'

export default async function NewUserPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  if (profile?.role !== 'admin') redirect('/members')

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#1A3666]">ユーザーを登録</h1>
        <p className="text-sm text-gray-500 mt-0.5">新しいログインアカウントを作成します</p>
      </div>

      <div className="bg-white rounded-xl border border-[#EAE0A8] p-6">
        <UserForm />
      </div>
    </div>
  )
}
