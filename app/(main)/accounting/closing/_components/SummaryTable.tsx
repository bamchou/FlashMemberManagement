import Link from 'next/link'
import type { MonthlySummary, SummaryLine } from '@/lib/accounting/monthlySummary'

const SOURCE_PAGE: Record<string, string> = {
  dues: '/accounting/dues',
  tournament: '/accounting/tournament',
  event_fees: '/accounting/event-fees',
  gym: '/accounting/gym',
  coach_pay: '/accounting/coach-pay',
  expenses: '/accounting/expenses',
}

const yen = (n: number) => `¥${n.toLocaleString()}`

function Section({
  title, lines, year, month, paidLabel, unpaidLabel,
}: {
  title: string
  lines: SummaryLine[]
  year: number
  month: number
  paidLabel: string
  unpaidLabel: string
}) {
  return (
    <div className="bg-white rounded-xl border border-[#EAE0A8] overflow-hidden">
      <div className="px-5 py-2.5 bg-[#F5C800]/10 border-b border-[#EAE0A8]">
        <h3 className="text-sm font-bold text-[#1A3666]">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-[#EAE0A8]">
            <tr>
              <th className="text-left px-4 py-2 font-semibold text-gray-500 text-xs">項目</th>
              <th className="text-right px-4 py-2 font-semibold text-gray-500 text-xs whitespace-nowrap">請求額</th>
              <th className="text-right px-4 py-2 font-semibold text-gray-500 text-xs whitespace-nowrap">{paidLabel}</th>
              <th className="text-right px-4 py-2 font-semibold text-gray-500 text-xs whitespace-nowrap">{unpaidLabel}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EAE0A8]">
            {lines.map(l => (
              <tr key={l.key}>
                <td className="px-4 py-2.5">
                  <Link href={`${SOURCE_PAGE[l.key] ?? '/accounting'}?year=${year}&month=${month}`} className="font-semibold text-[#1A3666] hover:underline">
                    {l.label}
                  </Link>
                  {l.note && <p className="text-[10px] text-gray-400">{l.note}</p>}
                </td>
                <td className="px-4 py-2.5 text-right text-gray-700 whitespace-nowrap">{yen(l.billed)}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-[#1A3666] whitespace-nowrap">{yen(l.paid)}</td>
                <td className={`px-4 py-2.5 text-right whitespace-nowrap ${l.unpaid > 0 ? 'font-bold text-orange-600' : 'text-gray-400'}`}>
                  {yen(l.unpaid)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function SummaryTable({ summary }: { summary: MonthlySummary }) {
  const income = summary.lines.filter(l => l.kind === 'income')
  const expense = summary.lines.filter(l => l.kind === 'expense')
  return (
    <div className="space-y-4">
      <Section title="収入" lines={income} year={summary.year} month={summary.month} paidLabel="入金済み" unpaidLabel="未収" />
      <Section title="支出" lines={expense} year={summary.year} month={summary.month} paidLabel="支払済み" unpaidLabel="未払い" />

      {summary.expenseCategories.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1">
          <span className="text-xs font-semibold text-gray-500">経費の内訳:</span>
          {summary.expenseCategories.map(c => (
            <span key={c.category} className="text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full">
              {c.category} {yen(c.amount)}
            </span>
          ))}
        </div>
      )}

      {/* 収支 */}
      <div className="bg-white rounded-xl border-2 border-[#1A3666] p-5">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xs font-semibold text-gray-400 mb-1">収入（入金済み）</p>
            <p className="text-lg font-bold text-[#1A3666]">{yen(summary.incomePaid)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 mb-1">支出（支払済み）</p>
            <p className="text-lg font-bold text-[#1A3666]">{yen(summary.expensePaid)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 mb-1">差額（収支）</p>
            <p className={`text-lg font-bold ${summary.net >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              {summary.net < 0 ? '-' : ''}{yen(Math.abs(summary.net))}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
