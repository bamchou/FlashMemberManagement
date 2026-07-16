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

type PracticeEvent = {
  id: string
  title: string
  start_at: string
  status: string
  payment_method: string | null
  payment_amount: number | null
  payment_status: string
  created_by: string | null
}

type UserSummary = {
  userId: string | null
  name: string
  events: PracticeEvent[]
  confirmedCount: number
  provisionalCount: number
  totalAmount: number
}

export default async function GymFeesPage({
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
  const view  = params.view === 'user' ? 'user' : 'date'

  const monthStart = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00+09:00`).toISOString()
  const nextMonth  = month === 12 ? 1 : month + 1
  const nextYear   = month === 12 ? year + 1 : year
  const monthEnd   = new Date(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00+09:00`).toISOString()

  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear  = month === 1 ? year - 1 : year
  const prevHref  = `/accounting/gym?year=${prevYear}&month=${prevMonth}&view=${view}`
  const nextHref  = `/accounting/gym?year=${nextYear}&month=${nextMonth}&view=${view}`
  const dateTabHref = `/accounting/gym?year=${year}&month=${month}&view=date`
  const userTabHref = `/accounting/gym?year=${year}&month=${month}&view=user`

  const adminSupabase = createAdminClient()

  const { data: events } = await adminSupabase
    .from('events')
    .select('id, title, start_at, status, payment_method, payment_amount, payment_status, created_by')
    .eq('event_type', 'practice')
    .gte('start_at', monthStart)
    .lt('start_at', monthEnd)
    .order('start_at', { ascending: true })

  const rows = (events ?? []) as PracticeEvent[]

  // 予約者名取得
  const creatorIds = [...new Set(rows.map(e => e.created_by).filter(Boolean) as string[])]
  let creatorMap: Record<string, string> = {}
  if (creatorIds.length > 0) {
    const { data: profiles } = await adminSupabase
      .from('profiles')
      .select('id, display_name, username')
      .in('id', creatorIds)
    creatorMap = Object.fromEntries(
      (profiles ?? []).map((p: { id: string; display_name: string | null; username: string }) => [
        p.id, p.display_name ?? p.username,
      ])
    )
  }

  // サマリー
  const confirmedRows = rows.filter(e => e.status === 'confirmed')
  const totalAmount   = confirmedRows
    .filter(e => e.payment_amount != null)
    .reduce((s, e) => s + (e.payment_amount ?? 0), 0)

  // ユーザー別集計
  const userSummaryMap: Record<string, UserSummary> = {}
  for (const event of rows) {
    const key = event.created_by ?? '__unknown__'
    if (!userSummaryMap[key]) {
      userSummaryMap[key] = {
        userId: event.created_by,
        name: event.created_by ? (creatorMap[event.created_by] ?? '不明') : '予約者なし',
        events: [],
        confirmedCount: 0,
        provisionalCount: 0,
        totalAmount: 0,
      }
    }
    userSummaryMap[key].events.push(event)
    if (event.status === 'confirmed') {
      userSummaryMap[key].confirmedCount++
      userSummaryMap[key].totalAmount += event.payment_amount ?? 0
    } else {
      userSummaryMap[key].provisionalCount++
    }
  }
  const userSummaries = Object.values(userSummaryMap).sort((a, b) => b.totalAmount - a.totalAmount)

  return (
    <div className="max-w-4xl">
      <Link href="/accounting" className="text-sm text-[#1A3666] hover:underline mb-4 inline-block">
        ← 経理管理に戻る
      </Link>

      {/* ヘッダー + 月ナビ */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[#1A3666]">体育館使用料管理</h1>
        <div className="flex items-center gap-2">
          <Link
            href={prevHref}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-[#1A3666]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <span className="text-sm font-bold text-[#1A3666] w-24 text-center">{year}年{month}月</span>
          <Link
            href={nextHref}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-[#1A3666]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-[#EAE0A8] p-4 text-center">
          <p className="text-xs font-semibold text-gray-400 mb-1">全件数</p>
          <p className="text-lg font-bold text-[#1A3666]">{rows.length}<span className="text-sm font-normal ml-0.5">件</span></p>
        </div>
        <div className="bg-white rounded-xl border border-[#EAE0A8] p-4 text-center">
          <p className="text-xs font-semibold text-gray-400 mb-1">仮登録</p>
          <p className="text-lg font-bold text-orange-500">{rows.filter(e => e.status !== 'confirmed').length}<span className="text-sm font-normal ml-0.5">件</span></p>
        </div>
        <div className="bg-white rounded-xl border border-[#EAE0A8] p-4 text-center">
          <p className="text-xs font-semibold text-gray-400 mb-1">確定</p>
          <p className="text-lg font-bold text-green-600">{confirmedRows.length}<span className="text-sm font-normal ml-0.5">件</span></p>
        </div>
        <div className="bg-white rounded-xl border border-[#EAE0A8] p-4 text-center">
          <p className="text-xs font-semibold text-gray-400 mb-1">合計金額</p>
          <p className="text-lg font-bold text-[#1A3666]">¥{totalAmount.toLocaleString()}</p>
        </div>
      </div>

      {/* ビュー切替タブ */}
      <div className="flex gap-1 mb-4 border-b border-[#EAE0A8]">
        <Link
          href={dateTabHref}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            view === 'date'
              ? 'border-[#1A3666] text-[#1A3666]'
              : 'border-transparent text-gray-400 hover:text-[#1A3666]'
          }`}
        >
          日別一覧
        </Link>
        <Link
          href={userTabHref}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            view === 'user'
              ? 'border-[#1A3666] text-[#1A3666]'
              : 'border-transparent text-gray-400 hover:text-[#1A3666]'
          }`}
        >
          ユーザー別
        </Link>
      </div>

      {/* ===== 日別一覧 ===== */}
      {view === 'date' && (
        <div className="bg-white rounded-xl border border-[#EAE0A8] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#EAE0A8] bg-[#F5C800]/10 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#1A3666]">{year}年{month}月の練習一覧</h2>
            <span className="text-xs text-gray-500">{rows.length} 件</span>
          </div>

          {rows.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-gray-400 text-sm">この月の練習予定はありません</p>
            </div>
          ) : (
            <>
              {/* デスクトップ */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-[#EAE0A8]">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs whitespace-nowrap">日付</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">練習場所</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs whitespace-nowrap">予約者名</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-500 text-xs whitespace-nowrap">確定 / 仮</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs whitespace-nowrap">決済方法</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs whitespace-nowrap">金額</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAE0A8]">
                    {rows.map(e => (
                      <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{formatDate(e.start_at)}</td>
                        <td className="px-4 py-3">
                          <Link href={`/calendar/${e.id}`} className="font-semibold text-[#1A3666] hover:underline">
                            {e.title}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {e.created_by ? (creatorMap[e.created_by] ?? '—') : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            e.status === 'confirmed'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-orange-100 text-orange-600'
                          }`}>
                            {e.status === 'confirmed' ? '確定' : '仮'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{e.payment_method ?? '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-[#1A3666]">
                          {e.payment_amount != null ? `¥${e.payment_amount.toLocaleString()}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* モバイル */}
              <div className="sm:hidden divide-y divide-[#EAE0A8]">
                {rows.map(e => (
                  <div key={e.id} className="px-4 py-4 space-y-1.5">
                    <p className="text-xs font-semibold text-[#1A3666]">{formatDate(e.start_at)}</p>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Link href={`/calendar/${e.id}`} className="font-bold text-[#1A3666] hover:underline truncate">
                          {e.title}
                        </Link>
                        <span className="text-xs text-gray-700 shrink-0">
                          {e.created_by ? (creatorMap[e.created_by] ?? '—') : '—'}
                        </span>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        e.status === 'confirmed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-orange-100 text-orange-600'
                      }`}>
                        {e.status === 'confirmed' ? '確定' : '仮'}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-[#1A3666]">
                      {e.payment_amount != null ? `¥${e.payment_amount.toLocaleString()}` : '—'}
                      {e.payment_method && (
                        <span className="text-xs font-normal text-gray-700 ml-1">（{e.payment_method}）</span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ===== ユーザー別 ===== */}
      {view === 'user' && (
        <div className="space-y-4">
          {userSummaries.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#EAE0A8] py-16 text-center">
              <p className="text-gray-400 text-sm">この月の練習予定はありません</p>
            </div>
          ) : (
            userSummaries.map(summary => (
              <div key={summary.userId ?? '__unknown__'} className="bg-white rounded-xl border border-[#EAE0A8] overflow-hidden">
                {/* ユーザーヘッダー */}
                <div className="px-5 py-4 bg-[#F5C800]/10 border-b border-[#EAE0A8] flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#1A3666] flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-bold">
                        {summary.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-[#1A3666]">{summary.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {summary.confirmedCount > 0 && (
                          <span className="text-xs text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full font-semibold">
                            確定 {summary.confirmedCount}件
                          </span>
                        )}
                        {summary.provisionalCount > 0 && (
                          <span className="text-xs text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full font-semibold">
                            仮 {summary.provisionalCount}件
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 font-semibold mb-0.5">確定分合計</p>
                    <p className="text-xl font-bold text-[#1A3666]">
                      ¥{summary.totalAmount.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* 明細テーブル */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-[#EAE0A8]">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-semibold text-gray-500 text-xs whitespace-nowrap">日付</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-gray-500 text-xs">練習場所</th>
                        <th className="text-center px-4 py-2.5 font-semibold text-gray-500 text-xs whitespace-nowrap">状態</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-gray-500 text-xs whitespace-nowrap">決済方法</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-gray-500 text-xs whitespace-nowrap">金額</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAE0A8]">
                      {summary.events.map(e => (
                        <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{formatDate(e.start_at)}</td>
                          <td className="px-4 py-3">
                            <Link href={`/calendar/${e.id}`} className="font-semibold text-[#1A3666] hover:underline">
                              {e.title}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              e.status === 'confirmed'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-orange-100 text-orange-600'
                            }`}>
                              {e.status === 'confirmed' ? '確定' : '仮'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{e.payment_method ?? '—'}</td>
                          <td className="px-4 py-3 text-right font-semibold text-[#1A3666]">
                            {e.payment_amount != null ? `¥${e.payment_amount.toLocaleString()}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {summary.confirmedCount > 0 && (
                      <tfoot className="border-t-2 border-[#EAE0A8] bg-[#FFFDF0]">
                        <tr>
                          <td colSpan={4} className="px-4 py-2.5 text-xs font-bold text-gray-500 text-right">確定分合計</td>
                          <td className="px-4 py-2.5 text-right font-bold text-[#1A3666]">
                            ¥{summary.totalAmount.toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* モバイル明細 */}
                <div className="sm:hidden divide-y divide-[#EAE0A8]">
                  {summary.events.map(e => (
                    <div key={e.id} className="px-4 py-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">{formatDate(e.start_at)}</p>
                        <Link href={`/calendar/${e.id}`} className="text-sm font-semibold text-[#1A3666] hover:underline truncate block">
                          {e.title}
                        </Link>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full block mb-1 ${
                          e.status === 'confirmed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-orange-100 text-orange-600'
                        }`}>
                          {e.status === 'confirmed' ? '確定' : '仮'}
                        </span>
                        <p className="text-sm font-bold text-[#1A3666]">
                          {e.payment_amount != null ? `¥${e.payment_amount.toLocaleString()}` : '—'}
                        </p>
                      </div>
                    </div>
                  ))}
                  {summary.confirmedCount > 0 && (
                    <div className="px-4 py-3 bg-[#FFFDF0] flex items-center justify-between">
                      <p className="text-xs font-bold text-gray-500">確定分合計</p>
                      <p className="font-bold text-[#1A3666]">¥{summary.totalAmount.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
