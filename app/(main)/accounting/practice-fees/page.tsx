import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { PracticeFeeSetting } from '@/lib/types'
import PracticeFeeForm from './_components/PracticeFeeForm'
import ExtraFeeForm from './_components/ExtraFeeForm'

export default async function PracticeFeesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (profile?.role !== 'admin') redirect('/members')

  const adminSupabase = createAdminClient()
  const [{ data: settings }, { data: extraFee }] = await Promise.all([
    adminSupabase
      .from('practice_fee_settings')
      .select('frequency, monthly_fee')
      .order('frequency', { ascending: true }),
    adminSupabase
      .from('extra_practice_fee_settings')
      .select('fee_per_session')
      .limit(1)
      .single(),
  ])

  const feeSettings = (settings ?? []) as PracticeFeeSetting[]

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/accounting" className="text-sm text-[#1A3666] hover:underline">
          ← 経理管理
        </Link>
      </div>

      <h1 className="text-xl font-bold text-[#1A3666] mb-2">月謝金額設定</h1>
      <p className="text-sm text-gray-500 mb-6">練習頻度ごとの月謝金額を設定してください。</p>

      <div className="space-y-3">
        {feeSettings.map(setting => (
          <PracticeFeeForm key={setting.frequency} setting={setting} />
        ))}
      </div>

      <div className="mt-8 mb-2 border-t border-[#EAE0A8] pt-6">
        <p className="text-sm font-bold text-[#1A3666] mb-1">超過分追加料金設定</p>
        <p className="text-xs text-gray-400 mb-4">月の参加予定回数を超えて練習に参加した場合の追加料金です。</p>
        <ExtraFeeForm initialFee={extraFee?.fee_per_session ?? 500} />
      </div>
    </div>
  )
}
