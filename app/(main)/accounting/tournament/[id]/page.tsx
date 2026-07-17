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

type ParticipantRow = {
  member_id: string
  participation_category: string | null
  fee_snapshot: number | null
}

type ChildRow = {
  memberId: string
  memberName: string
  category: string | null
  fee: number | null
}

type GuardianGroup = {
  guardianId: string
  guardianName: string
  children: ChildRow[]
  totalFee: number
}

export default async function TournamentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ view?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const view = sp.view === 'guardian' ? 'guardian' : 'member'

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
      .select('member_id, participation_category, fee_snapshot')
      .eq('event_id', id)
      .order('created_at', { ascending: true }),
  ])

  if (!event) notFound()

  const rows = (participantRows ?? []) as ParticipantRow[]
  const memberIds = rows.map(r => r.member_id)

  // メンバー詳細（guardian_id 込み）を取得
  type MemberRow = { id: string; full_name: string; guardian_id: string | null }
  let memberInfoMap: Record<string, { name: string; guardianId: string | null }> = {}
  if (memberIds.length > 0) {
    const { data: members } = await adminSupabase
      .from('members')
      .select('id, full_name, guardian_id')
      .in('id', memberIds)
    memberInfoMap = Object.fromEntries(
      (members ?? []).map((m: MemberRow) => [m.id, { name: m.full_name, guardianId: m.guardian_id }])
    )
  }

  // 帯同費：スナップショット値を優先
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

  const totalFee = rows.reduce((sum, r) => {
    const fee = r.fee_snapshot ?? calcFee(r.participation_category, event.singles_fee, event.doubles_fee, accompFeePerPerson) ?? 0
    return sum + fee
  }, 0)

  // 保護者別グループ
  let guardianGroups: GuardianGroup[] = []
  if (view === 'guardian' && rows.length > 0) {
    const guardianIds = [...new Set(
      Object.values(memberInfoMap).map(m => m.guardianId).filter((gid): gid is string => gid != null)
    )]
    let guardianNameMap: Record<string, string> = {}
    if (guardianIds.length > 0) {
      const { data: profileRows } = await adminSupabase
        .from('profiles')
        .select('id, display_name')
        .in('id', guardianIds)
      guardianNameMap = Object.fromEntries(
        (profileRows ?? []).map((p: { id: string; display_name: string | null }) => [p.id, p.display_name ?? '不明'])
      )
    }

    const groupMap: Record<string, GuardianGroup> = {}
    const NO_GUARDIAN = '__none__'
    for (const r of rows) {
      const info = memberInfoMap[r.member_id]
      const gid = info?.guardianId ?? NO_GUARDIAN
      const gname = gid !== NO_GUARDIAN ? (guardianNameMap[gid] ?? '不明') : '保護者なし'
      const fee = r.fee_snapshot ?? calcFee(r.participation_category, event.singles_fee, event.doubles_fee, accompFeePerPerson)
      if (!groupMap[gid]) groupMap[gid] = { guardianId: gid, guardianName: gname, children: [], totalFee: 0 }
      groupMap[gid].children.push({ memberId: r.member_id, memberName: info?.name ?? '不明', category: r.participation_category, fee })
      groupMap[gid].totalFee += fee ?? 0
    }
    guardianGroups = Object.values(groupMap).sort((a, b) => {
      if (b.totalFee !== a.totalFee) return b.totalFee - a.totalFee
      return a.guardianName.localeCompare(b.guardianName, 'ja')
    })
  }

  const memberTabHref   = `/accounting/tournament/${id}?view=member`
  const guardianTabHref = `/accounting/tournament/${id}?view=guardian`

  return (
    <div className="max-w-3xl">
      <Link href="/accounting/tournament" className="text-sm text-[#1A3666] hover:underline mb-4 inline-block">
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

      {/* ビュー切替タブ */}
      <div className="flex gap-1 mb-4 border-b border-[#EAE0A8]">
        {([
          { href: memberTabHref,   label: 'メンバー別', key: 'member' },
          { href: guardianTabHref, label: '保護者別',  key: 'guardian' },
        ] as const).map(tab => (
          <Link
            key={tab.key}
            href={tab.href}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              view === tab.key
                ? 'border-[#1A3666] text-[#1A3666]'
                : 'border-transparent text-gray-400 hover:text-[#1A3666]'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* ===== メンバー別 ===== */}
      {view === 'member' && (
        <details className="group bg-white rounded-xl border border-[#EAE0A8] overflow-hidden">
          <summary className="px-5 py-3 bg-[#F5C800]/10 border-b border-[#EAE0A8] flex items-center justify-between cursor-pointer list-none [&::-webkit-details-marker]:hidden select-none">
            <span className="text-sm font-bold text-[#1A3666]">参加メンバー一覧</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{rows.length}名</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400 shrink-0 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </summary>
          {rows.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-400 text-sm">参加登録がありません</p>
            </div>
          ) : (
            <>
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
                      const fee = r.fee_snapshot ?? calcFee(r.participation_category, event.singles_fee, event.doubles_fee, accompFeePerPerson)
                      return (
                        <tr key={r.member_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-[#1A3666]">
                            {memberInfoMap[r.member_id]?.name ?? '—'}
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

              <div className="sm:hidden divide-y divide-[#EAE0A8]">
                {rows.map(r => {
                  const fee = r.fee_snapshot ?? calcFee(r.participation_category, event.singles_fee, event.doubles_fee, accompFeePerPerson)
                  return (
                    <div key={r.member_id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-[#1A3666] text-sm">{memberInfoMap[r.member_id]?.name ?? '—'}</p>
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
        </details>
      )}

      {/* ===== 保護者別 ===== */}
      {view === 'guardian' && (
        <div className="space-y-4">
          {guardianGroups.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#EAE0A8] py-12 text-center">
              <p className="text-gray-400 text-sm">参加登録がありません</p>
            </div>
          ) : (
            guardianGroups.map(gg => (
              <details key={gg.guardianId} className="group bg-white rounded-xl border border-[#EAE0A8] overflow-hidden">
                {/* 保護者ヘッダー（クリックで折り畳み） */}
                <summary className="px-5 py-4 bg-[#F5C800]/10 border-b border-[#EAE0A8] flex items-center justify-between gap-4 flex-wrap cursor-pointer list-none [&::-webkit-details-marker]:hidden select-none">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#1A3666] flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-bold">{gg.guardianName.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-bold text-[#1A3666]">{gg.guardianName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{gg.children.length}名参加</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-gray-400 font-semibold mb-0.5">参加費合計</p>
                      <p className="text-xl font-bold text-[#1A3666]">¥{gg.totalFee.toLocaleString()}</p>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400 shrink-0 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </summary>

                {/* デスクトップテーブル */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-[#EAE0A8]">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-semibold text-gray-500 text-xs">名前</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-gray-500 text-xs">参加種目</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-gray-500 text-xs">参加費（帯同費含む）</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAE0A8]">
                      {gg.children.map(c => (
                        <tr key={c.memberId} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-[#1A3666]">{c.memberName}</td>
                          <td className="px-4 py-3 text-gray-700 text-xs">
                            {c.category ? (CATEGORY_LABEL[c.category] ?? '—') : '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-[#1A3666]">
                            {c.fee != null ? `¥${c.fee.toLocaleString()}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* モバイル */}
                <div className="sm:hidden divide-y divide-[#EAE0A8]">
                  {gg.children.map(c => (
                    <div key={c.memberId} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-[#1A3666] text-sm">{c.memberName}</p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {c.category ? (CATEGORY_LABEL[c.category] ?? '—') : '—'}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-[#1A3666] shrink-0">
                        {c.fee != null ? `¥${c.fee.toLocaleString()}` : '—'}
                      </p>
                    </div>
                  ))}
                </div>
              </details>
            ))
          )}
        </div>
      )}
    </div>
  )
}
