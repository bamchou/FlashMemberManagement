import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AccompanimentFeeSetting } from '@/lib/types'
import AccompanimentFeeForm from './_components/AccompanimentFeeForm'

export default async function AccompanimentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (profile?.role !== 'admin') redirect('/members')

  const adminSupabase = createAdminClient()
  const { data: fees } = await adminSupabase
    .from('accompaniment_fee_settings')
    .select('*')
    .order('amount_per_person')

  const rows = (fees ?? []) as AccompanimentFeeSetting[]

  return (
    <div className="max-w-2xl">
      <Link href="/accounting" className="text-sm text-[#1A3666] hover:underline mb-4 inline-block">
        ← 経理管理に戻る
      </Link>

      <h1 className="text-xl font-bold text-[#1A3666] mb-2">帯同費設定</h1>
      <p className="text-sm text-gray-500 mb-6">大会での帯同費の1人あたりの金額を設定します。</p>

      <div className="space-y-4">
        {rows.map(fee => (
          <AccompanimentFeeForm key={fee.area_type} fee={fee} />
        ))}
      </div>
    </div>
  )
}
