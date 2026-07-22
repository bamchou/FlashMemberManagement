'use client'

import { useState, useTransition } from 'react'
import { confirmDues, confirmAllDues, unconfirmDues, markDuesPaid, markDuesUnpaid, updateMemberFrequency } from '../actions'

export type MemberDuesSummary = {
  id: string
  name: string
  photoUrl: string | null
  practiceDays: string[]
  frequency: number | null
  baseFee: number | null
  liveTotalFee: number | null
  snapshot: {
    totalFee: number
    baseFee: number
    confirmedAt: string
  } | null
  payment: { amount: number; paidAt: string } | null
}

function MemberDuesRow({
  summary,
  year,
  month,
}: {
  summary: MemberDuesSummary
  year: number
  month: number
}) {
  const [isPending, startTransition] = useTransition()
  const [freqEditing, setFreqEditing] = useState(false)
  const [editFrequency, setEditFrequency] = useState<number | null>(summary.frequency)
  const [freqPending, startFreqTransition] = useTransition()
  const [freqError, setFreqError] = useState<string | null>(null)

  const isPaid = !!summary.payment
  const isConfirmed = !!summary.snapshot

  function handleSaveFrequency() {
    setFreqError(null)
    startFreqTransition(async () => {
      const result = await updateMemberFrequency(summary.id, editFrequency, summary.practiceDays)
      if (result?.error) setFreqError(result.error)
      else setFreqEditing(false)
    })
  }

  function handleConfirm() {
    if (summary.liveTotalFee == null || summary.baseFee == null) return
    if (!confirm(
      `${summary.name}さんの${year}年${month}月分を確定しますか？\n` +
      `月謝: ¥${summary.liveTotalFee.toLocaleString()}`
    )) return
    startTransition(async () => {
      await confirmDues(summary.id, year, month, {
        baseFee: summary.baseFee!,
        totalFee: summary.liveTotalFee!,
        frequencySnapshot: summary.frequency,
        practiceDaysSnapshot: summary.practiceDays,
      })
    })
  }

  function handleUnconfirm() {
    if (!confirm(`${summary.name}さんの確定を取り消しますか？`)) return
    startTransition(async () => {
      await unconfirmDues(summary.id, year, month)
    })
  }

  function handlePay() {
    if (!summary.snapshot) return
    if (!confirm(`${summary.name}さんの${year}年${month}月分（¥${summary.snapshot.totalFee.toLocaleString()}）を支払い済みにしますか？`)) return
    startTransition(async () => {
      await markDuesPaid(summary.id, year, month, summary.snapshot!.totalFee)
    })
  }

  function handleUnpay() {
    if (!confirm(`${summary.name}さんの支払い済み記録を取り消しますか？`)) return
    startTransition(async () => {
      await markDuesUnpaid(summary.id, year, month)
    })
  }

  // ── 支払い済み ──────────────────────────────────
  if (isPaid && summary.payment) {
    return (
      <div className="bg-white rounded-xl border border-green-300 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#F5C800]/20 border-2 border-[#F5C800] flex items-center justify-center overflow-hidden shrink-0">
          {summary.photoUrl
            ? <img src={summary.photoUrl} alt={summary.name} className="w-full h-full object-cover" />
            : <span className="text-xs">👤</span>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#1A3666] truncate">{summary.name}</p>
          <p className="text-xs text-gray-400">
            支払日: {new Date(summary.payment.paidAt).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-green-700">¥{summary.payment.amount.toLocaleString()}</p>
          <button
            type="button"
            disabled={isPending}
            onClick={handleUnpay}
            className="text-[10px] text-red-400 hover:text-red-600 disabled:opacity-50 transition-colors mt-0.5"
          >
            {isPending ? '処理中...' : '未払いに戻す'}
          </button>
        </div>
        <span className="text-xs font-bold text-green-700 bg-green-50 border border-green-300 px-2 py-0.5 rounded-full shrink-0">支払済</span>
      </div>
    )
  }

  // ── 確定済み・未払い ──────────────────────────
  if (isConfirmed && summary.snapshot) {
    const snap = summary.snapshot
    const confirmedDate = new Date(snap.confirmedAt).toLocaleDateString('ja-JP', {
      timeZone: 'Asia/Tokyo', month: 'long', day: 'numeric',
    })
    return (
      <div className="bg-white rounded-xl border border-amber-300 p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#F5C800]/20 border-2 border-[#F5C800] flex items-center justify-center overflow-hidden shrink-0">
              {summary.photoUrl
                ? <img src={summary.photoUrl} alt={summary.name} className="w-full h-full object-cover" />
                : <span className="text-sm">👤</span>}
            </div>
            <div>
              <p className="font-bold text-[#1A3666] text-sm">{summary.name}</p>
              <p className="text-xs text-gray-400">確定日: {confirmedDate}</p>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-full shrink-0">確定済み</span>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm">
          <div className="flex items-center justify-between text-gray-600">
            <span>基本月謝{summary.frequency != null ? `（週${summary.frequency}回）` : ''}</span>
            <span className="font-semibold text-[#1A3666]">¥{snap.baseFee.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-amber-200 pt-3">
          <span className="text-sm font-bold text-[#1A3666]">確定月謝</span>
          <span className="text-xl font-bold text-[#1A3666]">¥{snap.totalFee.toLocaleString()}</span>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={handleUnconfirm}
            className="flex-none px-4 py-2 text-sm font-semibold text-gray-500 border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {isPending ? '処理中...' : '確定取消'}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={handlePay}
            className="flex-1 py-2 text-sm font-bold bg-[#1A3666] text-white rounded-xl hover:bg-[#2A52A0] disabled:opacity-40 transition-colors"
          >
            {isPending ? '処理中...' : '支払い済みにする'}
          </button>
        </div>
      </div>
    )
  }

  // ── 未確定 ────────────────────────────────────
  const canConfirm = summary.liveTotalFee != null
  return (
    <div className="bg-white rounded-xl border border-[#EAE0A8] p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#F5C800]/20 border-2 border-[#F5C800] flex items-center justify-center overflow-hidden shrink-0">
            {summary.photoUrl
              ? <img src={summary.photoUrl} alt={summary.name} className="w-full h-full object-cover" />
              : <span className="text-sm">👤</span>}
          </div>
          <p className="font-bold text-[#1A3666] text-sm">{summary.name}</p>
        </div>
        <span className="text-xs font-bold text-gray-400 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full shrink-0">未確定</span>
      </div>

      {/* 参考情報（小） */}
      <div className="bg-[#FFFDF0] border border-[#EAE0A8] rounded-lg px-4 py-2 text-xs text-gray-500">
        <div className="flex items-center justify-between">
          <span>基本月謝（確定前）</span>
          {summary.baseFee != null
            ? <span>¥{summary.baseFee.toLocaleString()}</span>
            : <span className="text-amber-600 font-semibold">練習頻度未設定</span>}
        </div>
      </div>

      {/* 基本月謝 + 頻度変更（主） */}
      <div className="border-t border-[#EAE0A8] pt-3 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#1A3666]">
              基本月謝{summary.frequency != null ? `（週${summary.frequency}回）` : ''}
            </span>
            {!freqEditing && (
              <button
                type="button"
                onClick={() => { setEditFrequency(summary.frequency); setFreqEditing(true) }}
                className="text-xs text-[#1A3666] underline underline-offset-2 hover:text-[#2A52A0] transition-colors"
              >
                変更
              </button>
            )}
          </div>
          {summary.baseFee != null
            ? <span className="text-xl font-bold text-[#1A3666]">¥{summary.baseFee.toLocaleString()}</span>
            : <span className="text-sm font-semibold text-amber-600">未設定</span>}
        </div>

        {/* 頻度編集コントロール */}
        {freqEditing && (
          <div className="flex items-center gap-2 pt-1 border-t border-[#EAE0A8]">
            <select
              value={editFrequency ?? ''}
              onChange={e => setEditFrequency(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1A3666] bg-white"
            >
              {editFrequency == null && <option value="" disabled>選択してください</option>}
              {[1, 2, 3, 4, 5].map(n => (
                <option key={n} value={n}>週{n}回</option>
              ))}
            </select>
            {freqError && <span className="text-red-600 text-xs">{freqError}</span>}
            <button
              type="button"
              onClick={handleSaveFrequency}
              disabled={freqPending}
              className="px-3 py-1 text-xs font-bold bg-[#1A3666] text-white rounded-lg hover:bg-[#2A52A0] disabled:opacity-50 transition-colors"
            >
              {freqPending ? '...' : '保存'}
            </button>
            <button
              type="button"
              onClick={() => { setEditFrequency(summary.frequency); setFreqEditing(false); setFreqError(null) }}
              disabled={freqPending}
              className="px-3 py-1 text-xs font-semibold text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
            >
              取消
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        disabled={isPending || !canConfirm}
        onClick={handleConfirm}
        className="w-full py-2 text-sm font-bold bg-[#1A3666] text-white rounded-xl hover:bg-[#2A52A0] disabled:opacity-40 transition-colors"
      >
        {isPending ? '処理中...' : canConfirm ? '月謝を確定する' : '練習頻度を設定してください'}
      </button>
    </div>
  )
}

function BulkConfirmButton({
  year,
  month,
  unconfirmed,
}: {
  year: number
  month: number
  unconfirmed: MemberDuesSummary[]
}) {
  const [isPending, startTransition] = useTransition()

  if (unconfirmed.length === 0) return null

  const hasUnset = unconfirmed.some(s => s.liveTotalFee == null)
  const total = unconfirmed.reduce((sum, s) => sum + (s.liveTotalFee ?? 0), 0)

  function handleBulkConfirm() {
    const ok = confirm(
      `【一括確定】${year}年${month}月分\n\n` +
      `未確定 ${unconfirmed.length}名・合計 ¥${total.toLocaleString()} を確定します。\n\n` +
      `確定後は個別に「確定取消」しないと変更できません。\nよろしいですか？`
    )
    if (!ok) return

    startTransition(async () => {
      await confirmAllDues(
        year,
        month,
        unconfirmed.map(s => ({
          memberId: s.id,
          baseFee: s.baseFee!,
          totalFee: s.liveTotalFee!,
          frequencySnapshot: s.frequency,
          practiceDaysSnapshot: s.practiceDays,
        }))
      )
    })
  }

  if (hasUnset) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
        練習頻度が未設定のメンバーがいるため、一括確定できません。全員の練習頻度を設定してください。
      </div>
    )
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleBulkConfirm}
      className="w-full py-2.5 text-sm font-bold bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-40 transition-colors"
    >
      {isPending ? '処理中...' : `未確定 ${unconfirmed.length}名 を一括確定する`}
    </button>
  )
}

export default function DuesClient({
  year,
  month,
  summaries,
  prevHref,
  nextHref,
}: {
  year: number
  month: number
  summaries: MemberDuesSummary[]
  prevHref: string
  nextHref: string
}) {
  const paidCount = summaries.filter(s => s.payment).length
  const confirmedCount = summaries.filter(s => s.snapshot && !s.payment).length
  const unconfirmedCount = summaries.length - paidCount - confirmedCount

  const totalAmount = summaries.reduce((sum, s) => {
    return sum + (s.snapshot?.totalFee ?? s.liveTotalFee ?? 0)
  }, 0)
  const paidAmount = summaries.filter(s => s.payment).reduce((sum, s) => sum + (s.payment?.amount ?? 0), 0)

  return (
    <div className="space-y-5">
      {/* 月ナビゲーション */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-[#EAE0A8] px-4 py-3">
        <a href={prevHref} className="p-2 text-[#1A3666] hover:bg-[#F5F8FF] rounded-lg transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </a>
        <h2 className="text-base font-bold text-[#1A3666]">{year}年{month}月分</h2>
        <a href={nextHref} className="p-2 text-[#1A3666] hover:bg-[#F5F8FF] rounded-lg transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-[#EAE0A8] p-4 text-center">
          <p className="text-xs font-semibold text-gray-500 mb-1">未確定</p>
          <p className="text-xl font-bold text-gray-500">{unconfirmedCount}<span className="text-sm ml-0.5">名</span></p>
        </div>
        <div className="bg-white rounded-xl border border-amber-300 p-4 text-center">
          <p className="text-xs font-semibold text-gray-500 mb-1">確定済み</p>
          <p className="text-xl font-bold text-amber-600">{confirmedCount}<span className="text-sm ml-0.5">名</span></p>
        </div>
        <div className="bg-white rounded-xl border border-green-300 p-4 text-center">
          <p className="text-xs font-semibold text-gray-500 mb-1">支払済み</p>
          <p className="text-xl font-bold text-green-700">{paidCount}<span className="text-sm ml-0.5">名</span></p>
        </div>
      </div>
      <div className="bg-[#F5F8FF] border border-[#D0DCF5] rounded-xl px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500">今月の合計月謝</p>
          <p className="text-2xl font-bold text-[#1A3666] mt-0.5">¥{totalAmount.toLocaleString()}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-gray-500">うち支払済み</p>
          <p className="text-lg font-bold text-green-700 mt-0.5">¥{paidAmount.toLocaleString()}</p>
        </div>
      </div>

      {/* 一括確定 */}
      <BulkConfirmButton
        year={year}
        month={month}
        unconfirmed={summaries.filter(s => !s.snapshot && !s.payment)}
      />

      {/* メンバー一覧 */}
      {summaries.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#EAE0A8] p-8 text-center text-gray-400 text-sm">
          表示中のメンバーがいません
        </div>
      ) : (
        <div className="space-y-3">
          {summaries.map(s => (
            <MemberDuesRow key={s.id} summary={s} year={year} month={month} />
          ))}
        </div>
      )}
    </div>
  )
}
