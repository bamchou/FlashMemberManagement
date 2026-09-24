import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isMonthClosed } from '@/lib/accounting/closing'
import { isImageFile, toSupabaseImageUrl } from '@/lib/utils/imageUrl'
import ExpenseForm from './_components/ExpenseForm'
import DeleteExpenseButton from './_components/DeleteExpenseButton'

type ExpenseRow = {
  id: string
  expense_date: string
  category: string
  amount: number
  memo: string | null
  receipt_url: string | null
  receipt_name: string | null
}

function formatDay(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00+09:00`)
  return d.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', weekday: 'short' })
}

export default async function ExpensesPage({
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
  const year = parseInt(params.year ?? String(nowJST.getUTCFullYear()), 10)
  const month = parseInt(params.month ?? String(nowJST.getUTCMonth() + 1), 10)

  const pad = (n: number) => String(n).padStart(2, '0')
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 }
  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 }
  const dateFrom = `${year}-${pad(month)}-01`
  const dateTo = `${next.y}-${pad(next.m)}-01`

  const admin = createAdminClient()
  const [{ data }, closed] = await Promise.all([
    admin
      .from('expenses')
      .select('id, expense_date, category, amount, memo, receipt_url, receipt_name')
      .gte('expense_date', dateFrom)
      .lt('expense_date', dateTo)
      .order('expense_date', { ascending: true })
      .order('created_at', { ascending: true }),
    isMonthClosed(year, month),
  ])
  const rows = (data ?? []) as ExpenseRow[]
  const total = rows.reduce((s, r) => s + r.amount, 0)
  const byCategory: Record<string, number> = {}
  for (const r of rows) byCategory[r.category] = (byCategory[r.category] ?? 0) + r.amount

  // 登録フォームの日付初期値: 表示中の月が今月なら今日、それ以外は月初
  const todayJST = nowJST.toISOString().slice(0, 10)
  const defaultDate = todayJST.startsWith(`${year}-${pad(month)}`) ? todayJST : dateFrom

  return (
    <div className="max-w-2xl">
      <Link href="/accounting" className="text-sm text-[#1A3666] hover:underline mb-4 inline-block">
        ← 経理管理に戻る
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[#1A3666]">経費管理</h1>
        <div className="flex items-center gap-2">
          <Link href={`/accounting/expenses?year=${prev.y}&month=${prev.m}`} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-[#1A3666]">‹</Link>
          <span className="text-sm font-bold text-[#1A3666] w-24 text-center">{year}年{month}月</span>
          <Link href={`/accounting/expenses?year=${next.y}&month=${next.m}`} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-[#1A3666]">›</Link>
        </div>
      </div>

      {/* 合計 */}
      <div className="bg-white rounded-xl border border-[#EAE0A8] p-5 mb-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-500">{month}月の経費合計</p>
          <p className="text-xl font-bold text-[#1A3666]">¥{total.toLocaleString()}</p>
        </div>
        {Object.keys(byCategory).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {Object.entries(byCategory).map(([cat, amt]) => (
              <span key={cat} className="text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                {cat} ¥{amt.toLocaleString()}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 登録フォーム（締め済みの月は非表示） */}
      <div className="mb-4">
        {closed ? (
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-500">
            🔒 {year}年{month}月は締め済みのため、経費の登録・削除はできません。変更する場合は
            <Link href={`/accounting/closing?year=${year}&month=${month}`} className="text-[#1A3666] underline mx-1">月次締め</Link>
            で締めを解除してください。
          </div>
        ) : (
          <ExpenseForm key={`${year}-${month}`} defaultDate={defaultDate} />
        )}
      </div>

      {/* 一覧 */}
      <div className="bg-white rounded-xl border border-[#EAE0A8] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#EAE0A8] bg-[#F5C800]/10 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#1A3666]">{month}月の経費一覧</h2>
          <span className="text-xs text-gray-500">{rows.length} 件</span>
        </div>
        {rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">この月の経費はまだありません</p>
        ) : (
          <div className="divide-y divide-[#EAE0A8]">
            {rows.map(r => {
              const image = isImageFile(r.receipt_name)
              return (
                <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                  {r.receipt_url ? (
                    <a href={r.receipt_url} target="_blank" rel="noopener noreferrer" className="shrink-0" title="領収書を開く">
                      {image ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={toSupabaseImageUrl(r.receipt_url, 120) ?? r.receipt_url}
                          alt="領収書"
                          className="w-10 h-10 object-cover rounded border border-gray-200 bg-white"
                        />
                      ) : (
                        <span className="w-10 h-10 flex items-center justify-center rounded border border-gray-200 text-[10px] font-bold text-red-500">PDF</span>
                      )}
                    </a>
                  ) : (
                    <span className="w-10 h-10 flex items-center justify-center rounded border border-dashed border-gray-200 text-[10px] text-gray-300 shrink-0">なし</span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-500">
                      {formatDay(r.expense_date)}
                      <span className="ml-2 font-semibold text-gray-600">{r.category}</span>
                    </p>
                    {r.memo && <p className="text-sm text-[#1A3666] truncate">{r.memo}</p>}
                  </div>
                  <p className="text-sm font-bold text-[#1A3666] shrink-0">¥{r.amount.toLocaleString()}</p>
                  {!closed && <DeleteExpenseButton id={r.id} label={`${r.category} ¥${r.amount.toLocaleString()}`} />}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
