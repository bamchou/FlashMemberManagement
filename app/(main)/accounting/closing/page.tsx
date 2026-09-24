import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeMonthlySummary, type MonthlySummary } from '@/lib/accounting/monthlySummary'
import SummaryTable from './_components/SummaryTable'
import { CloseMonthButton, ReopenMonthButton } from './_components/ClosingButtons'

export default async function ClosingPage({
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
  const curYear = nowJST.getUTCFullYear()
  const curMonth = nowJST.getUTCMonth() + 1
  const year = parseInt(params.year ?? String(curYear), 10)
  const month = parseInt(params.month ?? String(curMonth), 10)
  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 }
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 }
  const isFuture = year * 12 + month > curYear * 12 + curMonth
  const isCurrentMonth = year === curYear && month === curMonth

  const admin = createAdminClient()
  const { data: closing } = await admin
    .from('monthly_closings')
    .select('summary, closed_at, closed_by')
    .eq('year', year)
    .eq('month', month)
    .maybeSingle()

  let closedByName = ''
  if (closing?.closed_by) {
    const { data: p } = await admin.from('profiles').select('display_name, username').eq('id', closing.closed_by).single()
    closedByName = p?.display_name ?? p?.username ?? ''
  }

  // 締め済みは記録した値、未締めは最新の値を表示
  const live = await computeMonthlySummary(year, month)
  const shown: MonthlySummary = closing ? (closing.summary as MonthlySummary) : live

  // 締め後に元データが変わっていないか（締め済みの数字は変わらないが、気付けるように表示）
  const changedAfterClose = !!closing && live.lines.some(l => {
    const s = shown.lines.find(x => x.key === l.key)
    return !s || s.billed !== l.billed || s.paid !== l.paid
  })

  const warnings = live.lines
    .filter(l => l.unpaid > 0)
    .map(l => `${l.label}：${l.kind === 'income' ? '未収' : '未払い'} ¥${l.unpaid.toLocaleString()}`)

  return (
    <div className="max-w-3xl">
      <Link href="/accounting" className="text-sm text-[#1A3666] hover:underline mb-4 inline-block">
        ← 経理管理に戻る
      </Link>

      <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-[#1A3666]">月次締め</h1>
        <div className="flex items-center gap-2">
          <Link href={`/accounting/closing?year=${prev.y}&month=${prev.m}`} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-[#1A3666]">‹</Link>
          <span className="text-sm font-bold text-[#1A3666] w-24 text-center">{year}年{month}月</span>
          <Link href={`/accounting/closing?year=${next.y}&month=${next.m}`} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-[#1A3666]">›</Link>
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-5">
        各項目の金額を確認して、月末に「締める」を押してください。締めた月は金額が確定し、お金に関わる変更ができなくなります。
        <Link href={`/accounting/report?year=${year}`} className="text-[#1A3666] underline ml-1">年間集計を見る</Link>
      </p>

      {/* 状態 */}
      {closing ? (
        <div className="bg-green-50 border border-green-300 rounded-xl px-5 py-4 mb-5 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-bold text-green-700">🔒 締め済み</p>
            <p className="text-xs text-green-700 mt-0.5">
              {new Date(closing.closed_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              {closedByName && `（${closedByName}）`}に締めました。下の金額は締めた時点の値です。
            </p>
          </div>
          <ReopenMonthButton year={year} month={month} />
        </div>
      ) : (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-3 mb-5">
          <p className="text-sm font-bold text-orange-600">未締め</p>
          <p className="text-xs text-orange-600 mt-0.5">下の金額は現在の最新の値です。</p>
        </div>
      )}

      {changedAfterClose && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-xl px-5 py-3 mb-5 text-xs text-yellow-800">
          ⚠️ 締めた後に元のデータ（コーチの出席や予定の金額など）が変わっています。締めた数字は変わりませんが、反映させたい場合は締めを解除してから再度締めてください。
        </div>
      )}

      <SummaryTable summary={shown} />

      {/* 締めるボタン */}
      {!closing && (
        <div className="mt-5">
          {isFuture ? (
            <p className="text-sm text-gray-400 text-center">未来の月は締められません</p>
          ) : (
            <>
              {warnings.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-3 mb-3">
                  <p className="text-xs font-bold text-orange-600 mb-1">未払い・未収があります（このまま締めることもできます）</p>
                  <ul className="text-xs text-orange-600 list-disc pl-5 space-y-0.5">
                    {warnings.map(w => <li key={w}>{w}</li>)}
                  </ul>
                </div>
              )}
              <CloseMonthButton year={year} month={month} warnings={warnings} isCurrentMonth={isCurrentMonth} />
            </>
          )}
        </div>
      )}
    </div>
  )
}
