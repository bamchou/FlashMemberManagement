import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { GymCandidate } from '@/lib/types'
import WeekdayCandidates from './_components/WeekdayCandidates'

export default async function GymCandidatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (profile?.role !== 'admin') redirect('/members')

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('gym_candidates')
    .select('*')
    .order('weekday')
    .order('priority')
  const candidates = (data ?? []) as GymCandidate[]

  return (
    <div className="max-w-3xl">
      <Link href="/shift" className="text-sm text-[#1A3666] hover:underline mb-4 inline-block">
        ← シフトに戻る
      </Link>
      <h1 className="text-xl font-bold text-[#1A3666] mb-1">体育館予約候補</h1>
      <p className="text-xs text-gray-500 mb-4">
        曜日ごとに第1〜第4候補の体育館・面数・予約時間を管理します。体育館名を空にして保存するとその候補は削除されます。
      </p>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
          データを読み込めませんでした。migrations/2026-09-add-gym-candidates.sql を実行済みか確認してください。
        </p>
      )}

      <div className="space-y-3">
        {[0, 1, 2, 3, 4, 5, 6].map(w => (
          <WeekdayCandidates
            key={w}
            weekday={w}
            initial={candidates
              .filter(c => c.weekday === w)
              .map(c => ({
                priority: c.priority,
                gym_name: c.gym_name,
                courts: c.courts != null ? String(c.courts) : '',
                start_time: c.start_time?.slice(0, 5) ?? '',
                end_time: c.end_time?.slice(0, 5) ?? '',
              }))}
          />
        ))}
      </div>
    </div>
  )
}
