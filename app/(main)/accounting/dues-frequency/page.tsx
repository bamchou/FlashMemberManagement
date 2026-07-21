import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import FrequencyClient from './_components/FrequencyClient'

export default async function DuesFrequencyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (profile?.role !== 'admin') redirect('/accounting')

  const admin = createAdminClient()
  const { data: members } = await admin
    .from('members')
    .select('id, full_name, photo_url, practice_days, practice_frequency')
    .eq('is_visible', true)
    .order('full_name', { ascending: true })

  const memberList = (members ?? []).map(m => ({
    id: m.id,
    name: m.full_name,
    photoUrl: m.photo_url,
    frequency: m.practice_frequency as number | null,
    practiceDays: (m.practice_days ?? []) as string[],
  }))

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/accounting" className="text-sm text-[#1A3666] hover:underline">
          ← 経理管理
        </Link>
        <h1 className="text-xl font-bold text-[#1A3666] mt-2">練習頻度一括設定</h1>
        <p className="text-sm text-gray-500 mt-0.5">メンバーの練習頻度を一覧から設定します。月謝の基本金額に使用されます。</p>
      </div>

      <FrequencyClient members={memberList} />
    </div>
  )
}
