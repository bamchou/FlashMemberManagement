'use client'

import { useActionState, useState } from 'react'
import { createExpense, type ExpenseFormState } from '../actions'
import { EXPENSE_CATEGORIES } from '@/lib/accounting/constants'
import Spinner from '@/app/(main)/_components/Spinner'

type Line = { category: string; amount: string; memo: string }

const emptyLine = (category = 'シャトル'): Line => ({ category, amount: '', memo: '' })
const isFilled = (l: Line) => l.amount.trim() !== '' || l.memo.trim() !== ''

/** 最後の行に入力があれば空欄行を1行足す（最低2行） */
function withTrailingBlank(lines: Line[]): Line[] {
  const next = lines.length >= 2 ? lines : [...lines, ...Array.from({ length: 2 - lines.length }, () => emptyLine())]
  const last = next[next.length - 1]
  return isFilled(last) ? [...next, emptyLine(last.category)] : next
}

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white'

/** 明細の入力欄。登録成功のたびに key を変えて作り直し、空の2行に戻す */
function LineEditor() {
  const [lines, setLines] = useState<Line[]>(() => [emptyLine(), emptyLine()])

  function update(index: number, patch: Partial<Line>) {
    setLines(prev => withTrailingBlank(prev.map((l, i) => (i === index ? { ...l, ...patch } : l))))
  }
  function remove(index: number) {
    setLines(prev => withTrailingBlank(prev.filter((_, i) => i !== index)))
  }
  const total = lines.reduce((s, l) => s + (parseInt(l.amount, 10) || 0), 0)

  return (
    <div>
      <p className="text-xs font-semibold text-[#1A3666] mb-1.5">明細</p>
      <div className="hidden sm:grid grid-cols-[8rem_8rem_1fr_1.5rem] gap-2 px-1 mb-1">
        <span className="text-[11px] text-gray-400">種類</span>
        <span className="text-[11px] text-gray-400">金額</span>
        <span className="text-[11px] text-gray-400">メモ（任意）</span>
        <span />
      </div>
      <div className="space-y-2">
        {lines.map((l, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1.5rem] sm:grid-cols-[8rem_8rem_1fr_1.5rem] gap-2 items-center">
            <select
              aria-label={`${i + 1}行目の種類`}
              value={l.category}
              onChange={e => update(i, { category: e.target.value })}
              className={inputCls}
            >
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="relative">
              <input
                aria-label={`${i + 1}行目の金額`}
                type="number"
                min="0"
                inputMode="numeric"
                placeholder="0"
                value={l.amount}
                onChange={e => update(i, { amount: e.target.value })}
                className={`${inputCls} pr-7`}
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-500">円</span>
            </div>
            {/* PCでは行末、スマホでは金額の右に置き、メモは2段目に回す */}
            <button
              type="button"
              onClick={() => remove(i)}
              disabled={lines.length <= 2 && !isFilled(l)}
              className="text-gray-300 hover:text-red-500 disabled:invisible text-lg leading-none sm:order-last"
              aria-label={`${i + 1}行目を削除`}
            >
              ×
            </button>
            <input
              aria-label={`${i + 1}行目のメモ`}
              type="text"
              lang="ja"
              placeholder="メモ（例: ヨネックス 10ダース）"
              value={l.memo}
              onChange={e => update(i, { memo: e.target.value })}
              className={`${inputCls} col-span-3 sm:col-span-1`}
            />
          </div>
        ))}
      </div>
      <p className="text-right text-sm font-bold text-[#1A3666] mt-2">合計 ¥{total.toLocaleString()}</p>
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />
    </div>
  )
}

export default function ExpenseForm({ defaultDate }: { defaultDate: string }) {
  const [state, action, pending] = useActionState<ExpenseFormState, FormData>(createExpense, undefined)
  // 登録成功ごとに変わる値。明細欄と領収書欄の key にして中身をリセットする
  const resetKey = state?.ok ? state.savedAt : 0

  return (
    <form action={action} className="bg-white rounded-xl border border-[#EAE0A8] p-5 space-y-4">
      <p className="text-sm font-bold text-[#1A3666]">経費を登録（領収書1枚ごと）</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="expense_date" className="block text-xs font-semibold text-[#1A3666] mb-1">日付</label>
          <input id="expense_date" name="expense_date" type="date" required defaultValue={defaultDate} className={inputCls} />
        </div>
        <div>
          <label htmlFor="receipt" className="block text-xs font-semibold text-[#1A3666] mb-1">領収書（任意・画像またはPDF）</label>
          <input
            key={`receipt-${resetKey}`}
            id="receipt"
            name="receipt"
            type="file"
            accept="image/*,application/pdf"
            className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#1A3666] file:text-white hover:file:bg-[#2A52A0] file:cursor-pointer"
          />
        </div>
      </div>

      <LineEditor key={`lines-${resetKey}`} />

      {state?.error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{state.error}</p>
      )}
      {state?.ok && !pending && (
        <p className="text-green-700 text-sm">登録しました</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full inline-flex items-center justify-center gap-1.5 bg-[#1A3666] text-white font-bold py-2.5 rounded-lg text-sm hover:bg-[#2A52A0] transition-colors disabled:opacity-60"
      >
        {pending && <Spinner className="w-4 h-4" />}
        {pending ? '登録中...' : '登録する'}
      </button>
    </form>
  )
}
