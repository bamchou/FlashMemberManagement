import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function formatDate(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  })
}

const CATEGORY_LABEL: Record<string, string> = {
  singles: 'シングルス',
  doubles: 'ダブルス',
  both:    'シングルス+ダブルス',
}

function calcFee(
  category: string | null,
  singlesFee: number | null,
  doublesFee: number | null,
  accompFeePerPerson: number,
): number | null {
  if (!category) return null
  let entryFee = 0
  if (category === 'singles') entryFee = singlesFee ?? 0
  else if (category === 'doubles') entryFee = doublesFee ?? 0
  else if (category === 'both') entryFee = (singlesFee ?? 0) + (doublesFee ?? 0)
  return entryFee + accompFeePerPerson
}

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (profile?.role !== 'admin') redirect('/members')

  const adminSupabase = createAdminClient()

  const [{ data: event }, { data: participantRows }] = await Promise.all([
    adminSupabase
      .from('events')
      .select('id, title, start_at, singles_fee, doubles_fee, accompaniment_type, accompaniment_fee_per_person, is_all_day')
      .eq('id', id)
      .single(),
    adminSupabase
      .from('event_participants')
      .select('member_id, participation_category')
      .eq('event_id', id)
      .order('created_at', { ascending: true }),
  ])

  if (!event) notFound()

  const memberIds = (participantRows ?? []).map((p: { member_id: string }) => p.member_id)

  // メンバー詳細を取得
  let memberMap: Record<string, { full_name: string }> = {}
  if (memberIds.length > 0) {
    const { data: members } = await adminSupabase
      .from('members')
      .select('id, full_name')
      .in('id', memberIds)
    memberMap = Object.fromEntries(
      (members ?? []).map((m: { id: string; full_name: string }) => [m.id, m])
    )
  }

  // 帯同費：スナップショット値を優先、未設定の旧イベントはマスタから補完
  let accompFeeLabel = ''
  let accompFeePerPerson: number = event.accompaniment_fee_per_person ?? 0
  if (event.accompaniment_type) {
    const { data: feeSettings } = await adminSupabase
      .from('accompaniment_fee_settings')
      .select('label, amount_per_person')
      .eq('area_type', event.accompaniment_type)
      .single()
    if (feeSettings) {
      if (accompFeePerPerson === 0) accompFeePerPerson = feeSettings.amount_per_person
      accompFeeLabel = `${feeSettings.label}（${accompFeePerPerson.toLocaleString()}円/人）`
    }
  }

  const rows = (participantRows ?? []) as {
    member_id: string
    participation_category: string | null
  }[]

  const totalFee = rows.reduce((sum, r) => {
    return sum + (calcFee(r.participation_category, event.singles_fee, event.doubles_fee, accompFeePerPerson) ?? 0)
  }, 0)

  return (
    <div className="max-w-3xl">
      <Link
        href="/accounting/tournament"
        className="text-sm text-[#1A3666] hover:underline mb-4 inline-block"
      >
        ← 大会参加費管理に戻る
      </Link>

      {/* 大会情報 */}
      <div className="bg-white rounded-xl border border-[#EAE0A8] p-5 mb-4">
        <p className="text-xs text-gray-400 mb-1">{formatDate(event.start_at)}</p>
        <h1 className="text-xl font-bold text-[#1A3666] mb-3">{event.title}</h1>
        <div className="flex flex-wrap gap-2">
          {event.singles_fee != null ? (
            <span className="text-xs font-semibold bg-[#F5C800]/20 text-[#1A3666] px-3 py-1 rounded-full">
              シングルス {event.singles_fee.toLocaleString()}円
            </span>
          ) : (
            <span className="text-xs font-semibold bg-gray-100 text-gray-500 px-3 py-1 rounded-full">
              シングルス 不要
            </span>
          )}
          {event.doubles_fee != null ? (
            <span className="text-xs font-semibold bg-[#F5C800]/20 text-[#1A3666] px-3 py-1 rounded-full">
              ダブルス {event.doubles_fee.toLocaleString()}円
            </span>
          ) : (
            <span className="text-xs font-semibold bg-gray-100 text-gray-500 px-3 py-1 rounded-full">
              ダブルス 不要
            </span>
          )}
          {accompFeeLabel ? (
            <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
              帯同費 {accompFeeLabel}
            </span>
          ) : (
            <span className="text-xs font-semibold bg-gray-100 text-gray-500 px-3 py-1 rounded-full">
              帯同費 なし
            </span>
          )}
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-xl border border-[#EAE0A8] p-4 text-center">
          <p className="text-xs font-semibold text-gray-400 mb-1">参加人数</p>
          <p className="text-lg font-bold text-[#1A3666]">{rows.length}<span className="text-sm font-normal ml-0.5">名</span></p>
        </div>
        <div className="bg-white rounded-xl border border-[#EAE0A8] p-4 text-center">
          <p className="text-xs font-semibold text-gray-400 mb-1">参加費合計</p>
          <p className="text-lg font-bold text-[#1A3666]">¥{totalFee.toLocaleString()}</p>
        </div>
      </div>

      {/* 参加者一覧 */}
      <div className="bg-white rounded-xl border border-[#EAE0A8] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#EAE0A8] bg-[#F5C800]/10">
          <h2 className="text-sm font-bold text-[#1A3666]">参加メンバー一覧</h2>
        </div>

        {rows.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-400 text-sm">参加登録がありません</p>
          </div>
        ) : (
          <>
            {/* デスクトップ */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-[#EAE0A8]">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">名前</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">参加種目</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">参加費（帯同費含む）</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE0A8]">
                  {rows.map(r => {
                    const fee = calcFee(r.participation_category, event.singles_fee, event.doubles_fee, accompFeePerPerson)
                    return (
                      <tr key={r.member_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-[#1A3666]">
                          {memberMap[r.member_id]?.full_name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-700 text-xs">
                          {r.participation_category ? (CATEGORY_LABEL[r.participation_category] ?? '—') : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-[#1A3666]">
                          {fee != null ? `¥${fee.toLocaleString()}` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* モバイル */}
            <div className="sm:hidden divide-y divide-[#EAE0A8]">
              {rows.map(r => {
                const fee = calcFee(r.participation_category, event.singles_fee, event.doubles_fee, accompFeePerPerson)
                return (
                  <div key={r.member_id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#1A3666] text-sm">
                        {memberMap[r.member_id]?.full_name ?? '—'}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {r.participation_category ? (CATEGORY_LABEL[r.participation_category] ?? '—') : '—'}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-[#1A3666] shrink-0">
                      {fee != null ? `¥${fee.toLocaleString()}` : '—'}
                    </p>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
