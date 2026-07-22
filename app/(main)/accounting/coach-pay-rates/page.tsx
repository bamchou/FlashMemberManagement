import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import CoachRateList from './_components/CoachRateList'

export default async function CoachPayRatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (profile?.role !== 'admin') redirect('/accounting')

  const admin = createAdminClient()
  const { data: coaches } = await admin
    .from('profiles')
    .select('id, display_name, username, photo_url, coach_rate_practice')
    .eq('role', 'coach')
    .order('display_name', { ascending: true })

  const coachList = (coaches ?? []).map(c => ({
    id: c.id,
    name: c.display_name ?? c.username ?? '不明',
    photoUrl: c.photo_url,
    ratePractice: c.coach_rate_practice,
  }))

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link href="/accounting" className="text-sm text-[#1A3666] hover:underline">
          ← 経理管理
        </Link>
        <h1 className="text-xl font-bold text-[#1A3666] mt-2">指導者バイト代設定</h1>
        <p className="text-sm text-gray-500 mt-1">指導者ごとの1回あたり単価を設定します</p>
      </div>

      <CoachRateList coaches={coachList} />
    </div>
  )
}
