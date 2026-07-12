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

export default async function TournamentAccountingPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (profile?.role !== 'admin') redirect('/members')

  const params = await searchParams
  const nowJST = new Date(new Date().getTime() + 9 * 60 * 60 * 1000)
  const year  = parseInt(params.year  ?? String(nowJST.getUTCFullYear()), 10)
  const month = parseInt(params.month ?? String(nowJST.getUTCMonth() + 1), 10)

  const monthStart = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00+09:00`).toISOString()
  const nextMonth  = month === 12 ? 1 : month + 1
  const nextYear   = month === 12 ? year + 1 : year
  const monthEnd   = new Date(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00+09:00`).toISOString()

  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear  = month === 1 ? year - 1 : year
  const prevHref  = `/accounting/tournament?year=${prevYear}&month=${prevMonth}`
  const nextHref  = `/accounting/tournament?year=${nextYear}&month=${nextMonth}`

  const adminSupabase = createAdminClient()

  const { data: events } = await adminSupabase
    .from('events')
    .select('id, title, start_at, singles_fee, doubles_fee, accompaniment_type')
    .eq('event_type', 'tournament')
    .gte('start_at', monthStart)
    .lt('start_at', monthEnd)
    .order('start_at', { ascending: true })

  const rows = events ?? []

  // 各大会の参加者数を取得
  const eventIds = rows.map((e: { id: string }) => e.id)
  let participantCountMap: Record<string, { approved: number; pending: number }> = {}
  if (eventIds.length > 0) {
    const { data: participants } = await adminSupabase
      .from('event_participants')
      .select('event_id, approval_status')
      .in('event_id', eventIds)

    for (const p of (participants ?? [])) {
      if (!participantCountMap[p.event_id]) participantCountMap[p.event_id] = { approved: 0, pending: 0 }
      if (p.approval_status === 'approved') participantCountMap[p.event_id].approved++
      else participantCountMap[p.event_id].pending++
    }
  }

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
            {rows.map((e: {
              id: string; title: string; start_at: string
              singles_fee: number | null; doubles_fee: number | null; accompaniment_type: string | null
            }) => {
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
    </div>
  )
}
