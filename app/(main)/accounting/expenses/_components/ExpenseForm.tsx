'use client'

import { useActionState, useEffect, useRef } from 'react'
import { createExpense, type ExpenseFormState } from '../actions'
import { EXPENSE_CATEGORIES } from '@/lib/accounting/constants'
import Spinner from '@/app/(main)/_components/Spinner'

export default function ExpenseForm({ defaultDate }: { defaultDate: string }) {
  const [state, action, pending] = useActionState<ExpenseFormState, FormData>(createExpense, undefined)
  const formRef = useRef<HTMLFormElement>(null)

  // 登録に成功したら入力欄をクリア（日付と種類は連続入力しやすいよう残す）
  useEffect(() => {
    if (!state?.ok || !formRef.current) return
    const form = formRef.current
    ;(form.elements.namedItem('amount') as HTMLInputElement).value = ''
    ;(form.elements.namedItem('memo') as HTMLInputElement).value = ''
    ;(form.elements.namedItem('receipt') as HTMLInputElement).value = ''
  }, [state])

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white'

  return (
    <form ref={formRef} action={action} className="bg-white rounded-xl border border-[#EAE0A8] p-5 space-y-3">
      <p className="text-sm font-bold text-[#1A3666]">経費を登録</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="expense_date" className="block text-xs font-semibold text-[#1A3666] mb-1">日付</label>
          <input id="expense_date" name="expense_date" type="date" required defaultValue={defaultDate} className={inputCls} />
        </div>
        <div>
          <label htmlFor="category" className="block text-xs font-semibold text-[#1A3666] mb-1">種類</label>
          <select id="category" name="category" required defaultValue="シャトル" className={inputCls}>
            {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="amount" className="block text-xs font-semibold text-[#1A3666] mb-1">金額</label>
          <div className="relative">
            <input id="amount" name="amount" type="number" min="0" inputMode="numeric" required placeholder="0" className={`${inputCls} pr-8`} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">円</span>
          </div>
        </div>
        <div>
          <label htmlFor="memo" className="block text-xs font-semibold text-[#1A3666] mb-1">メモ（任意）</label>
          <input id="memo" name="memo" type="text" lang="ja" placeholder="例: ヨネックス 10ダース" className={inputCls} />
        </div>
      </div>
      <div>
        <label htmlFor="receipt" className="block text-xs font-semibold text-[#1A3666] mb-1">領収書（任意・画像またはPDF）</label>
        <input
          id="receipt"
          name="receipt"
          type="file"
          accept="image/*,application/pdf"
          className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#1A3666] file:text-white hover:file:bg-[#2A52A0] file:cursor-pointer"
        />
      </div>
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
