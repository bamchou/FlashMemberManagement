'use client'

import { useTransition } from 'react'
import { closeMonth, reopenMonth } from '../actions'
import Spinner from '@/app/(main)/_components/Spinner'

export function CloseMonthButton({
  year, month, warnings, isCurrentMonth,
}: {
  year: number
  month: number
  warnings: string[]
  isCurrentMonth: boolean
}) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    const lines = [
      `${year}年${month}月を締めますか？`,
      '',
      '締めると、この月の金額が確定・記録され、支払済みの切替や経費の登録・削除などができなくなります（管理者は解除できます）。',
    ]
    if (isCurrentMonth) lines.push('', '※ まだ月の途中です。')
    if (warnings.length > 0) lines.push('', '【未払い・未収があります】', ...warnings.map(w => `・${w}`))
    if (!confirm(lines.join('\n'))) return
    startTransition(async () => {
      const res = await closeMonth(year, month)
      if (res?.error) alert(res.error)
    })
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleClick}
      className="w-full inline-flex items-center justify-center gap-1.5 bg-[#1A3666] text-white font-bold py-3 rounded-lg text-sm hover:bg-[#2A52A0] transition-colors disabled:opacity-60"
    >
      {isPending && <Spinner className="w-4 h-4" />}
      {isPending ? '締め処理中...' : `🔒 ${month}月を締める`}
    </button>
  )
}

export function ReopenMonthButton({ year, month }: { year: number; month: number }) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!confirm(`${year}年${month}月の締めを解除しますか？\n解除すると、この月のお金の変更が再びできるようになります。\n変更後は、もう一度締めてください。`)) return
    startTransition(async () => {
      const res = await reopenMonth(year, month)
      if (res?.error) alert(res.error)
    })
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleClick}
      className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-red-500 border border-red-300 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
    >
      {isPending && <Spinner className="w-3.5 h-3.5" />}
      {isPending ? '解除中...' : '締めを解除する'}
    </button>
  )
}
