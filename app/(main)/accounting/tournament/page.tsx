import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function formatDate(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: 'long', day: 'numeric', weekday: 'short',
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

type TournamentEvent = {
  id: string
  title: string
  start_at: string
  singles_fee: number | null
  doubles_fee: number | null
  accompaniment_type: string | null
  accompaniment_fee_per_person: number | null
}

type ParticipantRow = {
  event_id: string
  member_id: string
  participation_category: string | null
  fee_snapshot: number | null
  approval_status: string
}

type UserSummary = {
  memberId: string
  name: string
  participations: {
    event: TournamentEvent
    category: string | null
    fee: number | null
  }[]
  totalFee: number
}

type ChildSummary = {
  memberId: string
  memberName: string
  participations: {
    event: TournamentEvent
    category: string | null
    fee: number | null
  }[]
  childTotal: number
}

type GuardianSummary = {
  guardianId: string
  guardianName: string
  children: ChildSummary[]
  totalFee: number
}

export default async function TournamentAccountingPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; view?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (profile?.role !== 'admin') redirect('/members')

  const params = await searchParams
  const nowJST = new Date(new Date().getTime() + 9 * 60 * 60 * 1000)
  const year  = parseInt(params.year  ?? String(nowJST.getUTCFullYear()), 10)
  const month = parseInt(params.month ?? String(nowJST.getUTCMonth() + 1), 10)
  const view  = params.view === 'user' ? 'user' : params.view === 'guardian' ? 'guardian' : 'tournament'

  const monthStart = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00+09:00`).toISOString()
  const nextMonth  = month === 12 ? 1 : month + 1
  const nextYear   = month === 12 ? year + 1 : year
  const monthEnd   = new Date(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00+09:00`).toISOString()

  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear  = month === 1 ? year - 1 : year
  const prevHref          = `/accounting/tournament?year=${prevYear}&month=${prevMonth}&view=${view}`
  const nextHref          = `/accounting/tournament?year=${nextYear}&month=${nextMonth}&view=${view}`
  const tournamentTabHref = `/accounting/tournament?year=${year}&month=${month}&view=tournament`
  const userTabHref       = `/accounting/tournament?year=${year}&month=${month}&view=user`
  const guardianTabHref   = `/accounting/tournament?year=${year}&month=${month}&view=guardian`

  const adminSupabase = createAdminClient()

  const { data: events } = await adminSupabase
    .from('events')
    .select('id, title, start_at, singles_fee, doubles_fee, accompaniment_type, accompaniment_fee_per_person')
    .eq('event_type', 'tournament')
    .gte('start_at', monthStart)
    .lt('start_at', monthEnd)
    .order('start_at', { ascending: true })

  const rows = (events ?? []) as TournamentEvent[]
  const eventIds = rows.map(e => e.id)
  const eventMap: Record<string, TournamentEvent> = Object.fromEntries(rows.map(e => [e.id, e]))

  let allParticipants: ParticipantRow[] = []
  if (eventIds.length > 0) {
    const { data: participants } = await adminSupabase
      .from('event_participants')
      .select('event_id, member_id, participation_category, fee_snapshot, approval_status')
      .in('event_id', eventIds)
    allParticipants = (participants ?? []) as ParticipantRow[]
  }

  // 大会別: 参加者数カウント
  const participantCountMap: Record<string, { approved: number; pending: number }> = {}
  for (const p of allParticipants) {
    if (!participantCountMap[p.event_id]) participantCountMap[p.event_id] = { approved: 0, pending: 0 }
    if (p.approval_status === 'approved') participantCountMap[p.event_id].approved++
    else participantCountMap[p.event_id].pending++
  }

  // ユーザー別: メンバー名取得 + 集計
  let userSummaries: UserSummary[] = []
  if (view === 'user' && allParticipants.length > 0) {
    const memberIds = [...new Set(allParticipants.map(p => p.member_id))]
    const { data: members } = await adminSupabase
      .from('members')
      .select('id, full_name')
      .in('id', memberIds)
    const memberMap: Record<string, string> = Object.fromEntries(
      (members ?? []).map((m: { id: string; full_name: string }) => [m.id, m.full_name])
    )

    const summaryMap: Record<string, UserSummary> = {}
    for (const p of allParticipants) {
      const event = eventMap[p.event_id]
      if (!event) continue
      const fee = p.fee_snapshot ?? calcFee(
        p.participation_category,
        event.singles_fee,
        event.doubles_fee,
        event.accompaniment_fee_per_person ?? 0,
      )
      if (!summaryMap[p.member_id]) {
        summaryMap[p.member_id] = {
          memberId: p.member_id,
          name: memberMap[p.member_id] ?? '不明',
          participations: [],
          totalFee: 0,
        }
      }
      summaryMap[p.member_id].participations.push({ event, category: p.participation_category, fee })
      summaryMap[p.member_id].totalFee += fee ?? 0
    }
    userSummaries = Object.values(summaryMap).sort((a, b) => {
      if (b.totalFee !== a.totalFee) return b.totalFee - a.totalFee
      return a.name.localeCompare(b.name, 'ja')
    })
  }

  // 保護者別: メンバーの guardian_id で集計
  let guardianSummaries: GuardianSummary[] = []
  if (view === 'guardian' && allParticipants.length > 0) {
    const memberIds = [...new Set(allParticipants.map(p => p.member_id))]
    const { data: memberRows } = await adminSupabase
      .from('members')
      .select('id, full_name, guardian_id')
      .in('id', memberIds)

    type MemberRow = { id: string; full_name: string; guardian_id: string | null }
    const memberInfoMap: Record<string, { name: string; guardianId: string | null }> = Object.fromEntries(
      (memberRows ?? []).map((m: MemberRow) => [m.id, { name: m.full_name, guardianId: m.guardian_id }])
    )

    const guardianIds = [...new Set(
      Object.values(memberInfoMap).map(m => m.guardianId).filter((id): id is string => id != null)
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

    const guardianMap: Record<string, GuardianSummary> = {}
    const NO_GUARDIAN = '__none__'

    for (const p of allParticipants) {
      const event = eventMap[p.event_id]
      if (!event) continue
      const fee = p.fee_snapshot ?? calcFee(
        p.participation_category,
        event.singles_fee,
        event.doubles_fee,
        event.accompaniment_fee_per_person ?? 0,
      )
      const memberInfo = memberInfoMap[p.member_id]
      const guardianId = memberInfo?.guardianId ?? NO_GUARDIAN
      const guardianName = guardianId !== NO_GUARDIAN ? (guardianNameMap[guardianId] ?? '不明') : '保護者なし'

      if (!guardianMap[guardianId]) {
        guardianMap[guardianId] = { guardianId, guardianName, children: [], totalFee: 0 }
      }

      let child = guardianMap[guardianId].children.find(c => c.memberId === p.member_id)
      if (!child) {
        child = { memberId: p.member_id, memberName: memberInfo?.name ?? '不明', participations: [], childTotal: 0 }
        guardianMap[guardianId].children.push(child)
      }
      child.participations.push({ event, category: p.participation_category, fee })
      child.childTotal += fee ?? 0
      guardianMap[guardianId].totalFee += fee ?? 0
    }

    guardianSummaries = Object.values(guardianMap).sort((a, b) => {
      if (b.totalFee !== a.totalFee) return b.totalFee - a.totalFee
      return a.guardianName.localeCompare(b.guardianName, 'ja')
    })
  }

  // サマリー数値（両ビュー共通）
  const totalParticipants = allParticipants.filter(p => p.approval_status === 'approved').length
  const totalFeeAll = allParticipants.reduce((sum, p) => {
    const event = eventMap[p.event_id]
    if (!event) return sum
    const fee = p.fee_snapshot ?? calcFee(p.participation_category, event.singles_fee, event.doubles_fee, event.accompaniment_fee_per_person ?? 0) ?? 0
    return sum + fee
  }, 0)

  return (
    <div className="max-w-4xl">
      <Link href="/accounting" className="text-sm text-[#1A3666] hover:underline mb-4 inline-block">
        ← 経理管理に戻る
      </Link>

      {/* ヘッダー + 月ナビ */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[#1A3666]">大会参加費管理</h1>
        <div className="flex items-center gap-2">
          <Link href={prevHref} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-[#1A3666]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <span className="text-sm font-bold text-[#1A3666] w-24 text-center">{year}年{month}月</span>
          <Link href={nextHref} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-[#1A3666]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-[#EAE0A8] p-4 text-center">
          <p className="text-xs font-semibold text-gray-400 mb-1">大会数</p>
          <p className="text-lg font-bold text-[#1A3666]">{rows.length}<span className="text-sm font-normal ml-0.5">件</span></p>
        </div>
        <div className="bg-white rounded-xl border border-[#EAE0A8] p-4 text-center">
          <p className="text-xs font-semibold text-gray-400 mb-1">参加人数（延べ）</p>
          <p className="text-lg font-bold text-[#1A3666]">{totalParticipants}<span className="text-sm font-normal ml-0.5">名</span></p>
        </div>
        <div className="bg-white rounded-xl border border-[#EAE0A8] p-4 text-center">
          <p className="text-xs font-semibold text-gray-400 mb-1">参加費合計</p>
          <p className="text-lg font-bold text-[#1A3666]">¥{totalFeeAll.toLocaleString()}</p>
        </div>
      </div>

      {/* ビュー切替タブ */}
      <div className="flex gap-1 mb-4 border-b border-[#EAE0A8]">
        {([
          { href: tournamentTabHref, label: '大会別',   key: 'tournament' },
          { href: userTabHref,       label: 'メンバー別', key: 'user' },
          { href: guardianTabHref,   label: '保護者別',  key: 'guardian' },
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

      {/* ===== 大会別 ===== */}
      {view === 'tournament' && (
        <div className="bg-white rounded-xl border border-[#EAE0A8] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#EAE0A8] bg-[#F5C800]/10 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#1A3666]">{year}年{month}月の大会一覧</h2>
            <span className="text-xs text-gray-500">{rows.length} 件</span>
          </div>

          {rows.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-gray-400 text-sm">この月の大会はありません</p>
            </div>
          ) : (
            <div className="divide-y divide-[#EAE0A8]">
              {rows.map(e => {
                const counts = participantCountMap[e.id] ?? { approved: 0, pending: 0 }
                return (
                  <Link
                    key={e.id}
                    href={`/accounting/tournament/${e.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 mb-0.5">{formatDate(e.start_at)}</p>
                      <p className="font-semibold text-[#1A3666] group-hover:underline truncate">{e.title}</p>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {e.singles_fee != null && (
                          <span className="text-[11px] text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                            シングルス {e.singles_fee.toLocaleString()}円
                          </span>
                        )}
                        {e.doubles_fee != null && (
                          <span className="text-[11px] text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                            ダブルス {e.doubles_fee.toLocaleString()}円
                          </span>
                        )}
                        {e.accompaniment_type && (
                          <span className="text-[11px] text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                            帯同費あり
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-[#1A3666]">{counts.approved}名</p>
                      {counts.pending > 0 && (
                        <p className="text-xs text-orange-500">{counts.pending}名承認待ち</p>
                      )}
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== メンバー別 ===== */}
      {view === 'user' && (
        <div className="space-y-4">
          {userSummaries.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#EAE0A8] py-16 text-center">
              <p className="text-gray-400 text-sm">この月の参加登録はありません</p>
            </div>
          ) : (
            userSummaries.map(summary => (
              <details key={summary.memberId} className="group bg-white rounded-xl border border-[#EAE0A8] overflow-hidden">
                <summary className="px-5 py-4 bg-[#F5C800]/10 border-b border-[#EAE0A8] flex items-center justify-between gap-4 flex-wrap cursor-pointer list-none [&::-webkit-details-marker]:hidden select-none">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#1A3666] flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-bold">{summary.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-bold text-[#1A3666]">{summary.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{summary.participations.length}大会参加</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-gray-400 font-semibold mb-0.5">参加費合計</p>
                      <p className="text-xl font-bold text-[#1A3666]">¥{summary.totalFee.toLocaleString()}</p>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400 shrink-0 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </summary>

                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-[#EAE0A8]">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-semibold text-gray-500 text-xs whitespace-nowrap">日付</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-gray-500 text-xs">大会名</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-gray-500 text-xs whitespace-nowrap">種目</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-gray-500 text-xs whitespace-nowrap">参加費</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAE0A8]">
                      {summary.participations
                        .sort((a, b) => new Date(a.event.start_at).getTime() - new Date(b.event.start_at).getTime())
                        .map(p => (
                          <tr key={p.event.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{formatDate(p.event.start_at)}</td>
                            <td className="px-4 py-3">
                              <Link href={`/accounting/tournament/${p.event.id}`} className="font-semibold text-[#1A3666] hover:underline">
                                {p.event.title}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-gray-700 text-xs whitespace-nowrap">
                              {p.category ? (CATEGORY_LABEL[p.category] ?? '—') : '—'}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-[#1A3666]">
                              {p.fee != null ? `¥${p.fee.toLocaleString()}` : '—'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                <div className="sm:hidden divide-y divide-[#EAE0A8]">
                  {summary.participations
                    .sort((a, b) => new Date(a.event.start_at).getTime() - new Date(b.event.start_at).getTime())
                    .map(p => (
                      <div key={p.event.id} className="px-4 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500">{formatDate(p.event.start_at)}</p>
                          <Link href={`/accounting/tournament/${p.event.id}`} className="text-sm font-semibold text-[#1A3666] hover:underline truncate block">
                            {p.event.title}
                          </Link>
                          <p className="text-xs text-gray-500 mt-0.5">{p.category ? (CATEGORY_LABEL[p.category] ?? '—') : '—'}</p>
                        </div>
                        <p className="text-sm font-bold text-[#1A3666] shrink-0">{p.fee != null ? `¥${p.fee.toLocaleString()}` : '—'}</p>
                      </div>
                    ))}
                </div>
              </details>
            ))
          )}
        </div>
      )}

      {/* ===== 保護者別 ===== */}
      {view === 'guardian' && (
        <div className="space-y-4">
          {guardianSummaries.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#EAE0A8] py-16 text-center">
              <p className="text-gray-400 text-sm">この月の参加登録はありません</p>
            </div>
          ) : (
            guardianSummaries.map(gs => (
              <details key={gs.guardianId} className="group bg-white rounded-xl border border-[#EAE0A8] overflow-hidden">
                {/* 保護者ヘッダー（クリックで折り畳み） */}
                <summary className="px-5 py-4 bg-[#F5C800]/10 border-b border-[#EAE0A8] flex items-center justify-between gap-4 flex-wrap cursor-pointer list-none [&::-webkit-details-marker]:hidden select-none">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#1A3666] flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-bold">{gs.guardianName.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-bold text-[#1A3666]">{gs.guardianName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {gs.children.length}名の子供 / {gs.children.reduce((s, c) => s + c.participations.length, 0)}大会参加
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-gray-400 font-semibold mb-0.5">参加費合計</p>
                      <p className="text-xl font-bold text-[#1A3666]">¥{gs.totalFee.toLocaleString()}</p>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400 shrink-0 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </summary>

                {/* 子供ごとの明細 */}
                {gs.children
                  .sort((a, b) => a.memberName.localeCompare(b.memberName, 'ja'))
                  .map((child, childIdx) => (
                    <div key={child.memberId}>
                      {/* 子供名セパレーター */}
                      <div className={`px-5 py-2 flex items-center justify-between ${childIdx > 0 ? 'border-t border-[#EAE0A8]' : ''} bg-gray-50`}>
                        <span className="text-xs font-bold text-[#1A3666]">{child.memberName}</span>
                        {gs.children.length > 1 && (
                          <span className="text-xs font-semibold text-gray-500">
                            小計 ¥{child.childTotal.toLocaleString()}
                          </span>
                        )}
                      </div>

                      {/* デスクトップテーブル */}
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="border-b border-[#EAE0A8]">
                            <tr>
                              <th className="text-left px-4 py-2 font-semibold text-gray-400 text-xs whitespace-nowrap">日付</th>
                              <th className="text-left px-4 py-2 font-semibold text-gray-400 text-xs">大会名</th>
                              <th className="text-left px-4 py-2 font-semibold text-gray-400 text-xs whitespace-nowrap">種目</th>
                              <th className="text-right px-4 py-2 font-semibold text-gray-400 text-xs whitespace-nowrap">参加費</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#EAE0A8]">
                            {child.participations
                              .sort((a, b) => new Date(a.event.start_at).getTime() - new Date(b.event.start_at).getTime())
                              .map(p => (
                                <tr key={p.event.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{formatDate(p.event.start_at)}</td>
                                  <td className="px-4 py-3">
                                    <Link href={`/accounting/tournament/${p.event.id}`} className="font-semibold text-[#1A3666] hover:underline">
                                      {p.event.title}
                                    </Link>
                                  </td>
                                  <td className="px-4 py-3 text-gray-700 text-xs whitespace-nowrap">
                                    {p.category ? (CATEGORY_LABEL[p.category] ?? '—') : '—'}
                                  </td>
                                  <td className="px-4 py-3 text-right font-semibold text-[#1A3666]">
                                    {p.fee != null ? `¥${p.fee.toLocaleString()}` : '—'}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>

                      {/* モバイル */}
                      <div className="sm:hidden divide-y divide-[#EAE0A8]">
                        {child.participations
                          .sort((a, b) => new Date(a.event.start_at).getTime() - new Date(b.event.start_at).getTime())
                          .map(p => (
                            <div key={p.event.id} className="px-4 py-3 flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs text-gray-500">{formatDate(p.event.start_at)}</p>
                                <Link href={`/accounting/tournament/${p.event.id}`} className="text-sm font-semibold text-[#1A3666] hover:underline truncate block">
                                  {p.event.title}
                                </Link>
                                <p className="text-xs text-gray-500 mt-0.5">{p.category ? (CATEGORY_LABEL[p.category] ?? '—') : '—'}</p>
                              </div>
                              <p className="text-sm font-bold text-[#1A3666] shrink-0">{p.fee != null ? `¥${p.fee.toLocaleString()}` : '—'}</p>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
              </details>
            ))
          )}
        </div>
      )}
    </div>
  )
}
