import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { PracticeFeeSetting } from '@/lib/types'
import PracticeFeeForm from './_components/PracticeFeeForm'

export default async function PracticeFeesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (profile?.role !== 'admin') redirect('/members')

  const adminSupabase = createAdminClient()
  const { data: settings } = await adminSupabase
    .from('practice_fee_settings')
    .select('frequency, monthly_fee')
    .order('frequency', { ascending: true })

  const feeSettings = (settings ?? []) as PracticeFeeSetting[]

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/accounting" className="text-sm text-[#1A3666] hover:underline">
          ← 経理管理
        </Link>
      </div>

      <h1 className="text-xl font-bold text-[#1A3666] mb-2">月謝設定</h1>
      <p className="text-sm text-gray-500 mb-6">練習頻度ごとの月謝金額を設定してください。</p>

      <div className="space-y-3">
        {feeSettings.map(setting => (
          <PracticeFeeForm key={setting.frequency} setting={setting} />
        ))}
      </div>
    </div>
  )
}
