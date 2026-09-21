import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import PaidButton from './_components/PaidButton'

function formatDate(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: 'long', day: 'numeric', weekday: 'short',
  })
}

const TYPE_LABEL: Record<string, { label: string; cls: string }> = {
  social: { label: '親睦会', cls: 'bg-orange-100 text-orange-700' },
  event:  { label: 'イベント', cls: 'bg-green-100 text-green-700' },
}

type FeeEvent = {
  id: string
  title: string
  start_at: string
  event_type: string
  adult_fee: number | null
  child_fee: number | null
  payment_amount: number | null
}

type AttRow = {
  event_id: string
  user_id: string
  adult_count: number
  child_count: number
  is_paid: boolean
}

function feesOf(e: FeeEvent): { adultFee: number; childFee: number } {
  return {
    adultFee: e.adult_fee ?? e.payment_amount ?? 0,
    childFee: e.child_fee ?? 0,
  }
}

export default async function EventFeesAccountingPage({
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
  const view  = params.view === 'user' ? 'user' : 'event'

  const monthStart = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00+09:00`).toISOString()
  const nextMonth  = month === 12 ? 1 : month + 1
  const nextYear   = month === 12 ? year + 1 : year
  const monthEnd   = new Date(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00+09:00`).toISOString()

  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear  = month === 1 ? year - 1 : year
  const prevHref  = `/accounting/event-fees?year=${prevYear}&month=${prevMonth}&view=${view}`
  const nextHref  = `/accounting/event-fees?year=${nextYear}&month=${nextMonth}&view=${view}`
  const eventTabHref = `/accounting/event-fees?year=${year}&month=${month}&view=event`
  const userTabHref  = `/accounting/event-fees?year=${year}&month=${month}&view=user`

  const adminSupabase = createAdminClient()

  const { data: eventsData } = await adminSupabase
    .from('events')
    .select('id, title, start_at, event_type, adult_fee, child_fee, payment_amount')
    .in('event_type', ['social', 'event'])
    .gte('start_at', monthStart)
    .lt('start_at', monthEnd)
    .order('start_at', { ascending: true })

  const events = (eventsData ?? []) as FeeEvent[]
  const eventIds = events.map(e => e.id)
  const eventMap: Record<string, FeeEvent> = Object.fromEntries(events.map(e => [e.id, e]))

  let attendances: AttRow[] = []
  if (eventIds.length > 0) {
    const { data } = await adminSupabase
      .from('event_attendances')
      .select('event_id, user_id, adult_count, child_count, is_paid')
      .in('event_id', eventIds)
    attendances = (data ?? []) as AttRow[]
  }

  // ユーザー名
  const userIds = [...new Set(attendances.map(a => a.user_id))]
  let nameMap: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: profs } = await adminSupabase
      .from('profiles')
      .select('id, display_name, username')
      .in('id', userIds)
    nameMap = Object.fromEntries(
      (profs ?? []).map((p: { id: string; display_name: string | null; username: string | null }) =>
        [p.id, p.display_name ?? p.username ?? '不明'])
    )
  }

  const amountOf = (a: AttRow): number => {
    const e = eventMap[a.event_id]
    if (!e) return 0
    const { adultFee, childFee } = feesOf(e)
    return a.adult_count * adultFee + a.child_count * childFee
  }

  // サマリー
  const totalAmountAll = attendances.reduce((s, a) => s + amountOf(a), 0)
  const paidAmountAll = attendances.filter(a => a.is_paid).reduce((s, a) => s + amountOf(a), 0)
  const unpaidAmountAll = totalAmountAll - paidAmountAll

  // 予定別
  const attByEvent: Record<string, AttRow[]> = {}
  for (const a of attendances) {
    (attByEvent[a.event_id] ??= []).push(a)
  }

  // 参加者別
  type UserSummary = {
    userId: string
    name: string
    rows: { event: FeeEvent; adult: number; child: number; amount: number; isPaid: boolean }[]
    total: number
    unpaid: number
  }
  const userSummaries: UserSummary[] = (() => {
    const map: Record<string, UserSummary> = {}
    for (const a of attendances) {
      const e = eventMap[a.event_id]
      if (!e) continue
      const amount = amountOf(a)
      const s = (map[a.user_id] ??= {
        userId: a.user_id, name: nameMap[a.user_id] ?? '不明', rows: [], total: 0, unpaid: 0,
      })
      s.rows.push({ event: e, adult: a.adult_count, child: a.child_count, amount, isPaid: a.is_paid })
      s.total += amount
      if (!a.is_paid) s.unpaid += amount
    }
    return Object.values(map).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'ja'))
  })()

  return (
    <div className="max-w-4xl">
      <Link href="/accounting" className="text-sm text-[#1A3666] hover:underline mb-4 inline-block">
        ← 経理管理に戻る
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[#1A3666]">懇親会・イベント参加費管理</h1>
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
          <p className="text-xs font-semibold text-gray-400 mb-1">参加費合計</p>
          <p className="text-lg font-bold text-[#1A3666]">¥{totalAmountAll.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#EAE0A8] p-4 text-center">
          <p className="text-xs font-semibold text-gray-400 mb-1">回収済み</p>
          <p className="text-lg font-bold text-green-700">¥{paidAmountAll.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#EAE0A8] p-4 text-center">
          <p className="text-xs font-semibold text-gray-400 mb-1">未回収</p>
          <p className="text-lg font-bold text-orange-600">¥{unpaidAmountAll.toLocaleString()}</p>
        </div>
      </div>

      {/* ビュー切替タブ */}
      <div className="flex gap-1 mb-4 border-b border-[#EAE0A8]">
        {([
          { href: eventTabHref, label: '予定別',   key: 'event' },
          { href: userTabHref,  label: '参加者別', key: 'user' },
        ] as const).map(tab => (
          <Link
            key={tab.key}
            href={tab.href}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              view === tab.key ? 'border-[#1A3666] text-[#1A3666]' : 'border-transparent text-gray-400 hover:text-[#1A3666]'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* ===== 予定別 ===== */}
      {view === 'event' && (
        events.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#EAE0A8] py-16 text-center">
            <p className="text-gray-400 text-sm">この月の親睦会・イベントはありません</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map(e => {
              const rows = attByEvent[e.id] ?? []
              const { adultFee, childFee } = feesOf(e)
              const eventTotal = rows.reduce((s, a) => s + amountOf(a), 0)
              const paidTotal = rows.filter(a => a.is_paid).reduce((s, a) => s + amountOf(a), 0)
              const tinfo = TYPE_LABEL[e.event_type]
              return (
                <div key={e.id} className="bg-white rounded-xl border border-[#EAE0A8] overflow-hidden">
                  <div className="px-5 py-3 bg-[#F5C800]/10 border-b border-[#EAE0A8]">
                    <div className="flex items-center gap-2 flex-wrap">
                      {tinfo && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tinfo.cls}`}>{tinfo.label}</span>}
                      <Link href={`/calendar/${e.id}`} className="font-bold text-[#1A3666] hover:underline">{e.title}</Link>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(e.start_at)}　大人 {adultFee.toLocaleString()}円 / 子供 {childFee.toLocaleString()}円
                    </p>
                  </div>

                  {rows.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">参加登録がありません</p>
                  ) : (
                    <div className="divide-y divide-[#EAE0A8]">
                      {rows
                        .slice()
                        .sort((a, b) => (nameMap[a.user_id] ?? '').localeCompare(nameMap[b.user_id] ?? '', 'ja'))
                        .map(a => (
                          <div key={a.user_id} className="flex items-center gap-3 px-5 py-3">
                            <span className="text-sm font-semibold text-[#1A3666] flex-1 truncate">{nameMap[a.user_id] ?? '不明'}</span>
                            <span className="text-xs text-gray-500 shrink-0">大人{a.adult_count}・子供{a.child_count}</span>
                            <span className="text-sm font-bold text-[#1A3666] shrink-0 w-20 text-right">¥{amountOf(a).toLocaleString()}</span>
                            <PaidButton eventId={e.id} userId={a.user_id} isPaid={a.is_paid} />
                          </div>
                        ))}
                    </div>
                  )}

                  {rows.length > 0 && (
                    <div className="px-5 py-3 bg-gray-50 border-t border-[#EAE0A8] flex items-center justify-between text-sm">
                      <span className="text-gray-500">回収 ¥{paidTotal.toLocaleString()} / 未回収 ¥{(eventTotal - paidTotal).toLocaleString()}</span>
                      <span className="font-bold text-[#1A3666]">合計 ¥{eventTotal.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ===== 参加者別 ===== */}
      {view === 'user' && (
        userSummaries.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#EAE0A8] py-16 text-center">
            <p className="text-gray-400 text-sm">この月の参加登録はありません</p>
          </div>
        ) : (
          <div className="space-y-4">
            {userSummaries.map(s => (
              <details key={s.userId} className="group bg-white rounded-xl border border-[#EAE0A8] overflow-hidden">
                <summary className="px-5 py-4 bg-[#F5C800]/10 border-b border-[#EAE0A8] flex items-center justify-between gap-4 flex-wrap cursor-pointer list-none [&::-webkit-details-marker]:hidden select-none">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#1A3666] flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-bold">{s.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-bold text-[#1A3666]">{s.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {s.rows.length}件参加
                        {s.unpaid > 0 && <span className="text-orange-500 font-semibold ml-1">・未払い ¥{s.unpaid.toLocaleString()}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-gray-400 font-semibold mb-0.5">参加費合計</p>
                      <p className="text-xl font-bold text-[#1A3666]">¥{s.total.toLocaleString()}</p>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400 shrink-0 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </summary>

                <div className="divide-y divide-[#EAE0A8]">
                  {s.rows
                    .slice()
                    .sort((a, b) => new Date(a.event.start_at).getTime() - new Date(b.event.start_at).getTime())
                    .map(r => (
                      <div key={r.event.id} className="flex items-center gap-3 px-5 py-3">
                        <div className="min-w-0 flex-1">
                          <Link href={`/calendar/${r.event.id}`} className="text-sm font-semibold text-[#1A3666] hover:underline truncate block">
                            {r.event.title}
                          </Link>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatDate(r.event.start_at)}　大人{r.adult}・子供{r.child}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-[#1A3666] shrink-0 w-20 text-right">¥{r.amount.toLocaleString()}</span>
                        <PaidButton eventId={r.event.id} userId={s.userId} isPaid={r.isPaid} />
                      </div>
                    ))}
                </div>
              </details>
            ))}
          </div>
        )
      )}
    </div>
  )
}
