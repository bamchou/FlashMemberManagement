'use client'

import { useTransition } from 'react'
import { markDuesPaid, markDuesUnpaid } from '../actions'

export type MemberDuesSummary = {
  id: string
  name: string
  photoUrl: string | null
  practiceDays: string[]
  frequency: number | null
  baseFee: number | null
  expectedCount: number
  actualCount: number
  excessCount: number
  extraFeePerSession: number
  totalFee: number | null
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
  const isPaid = !!summary.payment
  const isOver = summary.actualCount > summary.expectedCount

  function handlePay() {
    if (summary.totalFee == null) return
    if (!confirm(`${summary.name}さんの${year}年${month}月分（¥${summary.totalFee.toLocaleString()}）を支払い済みにしますか？`)) return
    startTransition(async () => {
      await markDuesPaid(summary.id, year, month, summary.totalFee!)
    })
  }

  function handleUnpay() {
    if (!confirm(`${summary.name}さんの支払い済み記録を取り消しますか？`)) return
    startTransition(async () => {
      await markDuesUnpaid(summary.id, year, month)
    })
  }

  return (
    <div className={`bg-white rounded-xl border p-5 space-y-3 ${isPaid ? 'border-green-300' : 'border-[#EAE0A8]'}`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#F5C800]/20 border-2 border-[#F5C800] flex items-center justify-center overflow-hidden shrink-0">
            {summary.photoUrl
              ? <img src={summary.photoUrl} alt={summary.name} className="w-full h-full object-cover" />
              : <span className="text-sm">👤</span>}
          </div>
          <div>
            <p className="font-bold text-[#1A3666] text-sm">{summary.name}</p>
            <p className="text-xs text-gray-400">
              {summary.frequency != null && <span className="mr-2">週{summary.frequency}回</span>}
              {summary.practiceDays.length > 0 && <>参加予定曜日: {summary.practiceDays.join('・')}</>}
            </p>
          </div>
        </div>
        {isPaid ? (
          <span className="text-xs font-bold text-green-700 bg-green-50 border border-green-300 px-2.5 py-1 rounded-full shrink-0">支払済み</span>
        ) : (
          <span className="text-xs font-bold text-gray-400 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full shrink-0">未払い</span>
        )}
      </div>

      {/* 参加回数 */}
      <div className="bg-[#FFFDF0] border border-[#EAE0A8] rounded-lg px-4 py-3 space-y-1.5 text-sm">
        <div className="flex items-center justify-between text-gray-600">
          <span>今月の参加予定回数</span>
          <span className="font-semibold text-[#1A3666]">{summary.expectedCount}回</span>
        </div>
        <div className="flex items-center justify-between text-gray-600">
          <span>実際の参加回数</span>
          <span className={`font-semibold ${isOver ? 'text-red-600' : 'text-[#1A3666]'}`}>
            {summary.actualCount}回
            {isOver && <span className="text-xs ml-1">(予定超過)</span>}
          </span>
        </div>
        {summary.excessCount > 0 && (
          <div className="flex items-center justify-between text-red-600 text-xs border-t border-red-100 pt-1.5">
            <span>超過分　{summary.excessCount}回 × ¥{summary.extraFeePerSession.toLocaleString()}</span>
            <span className="font-semibold">+¥{(summary.excessCount * summary.extraFeePerSession).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* 月謝合計 */}
      <div className="flex items-center justify-between border-t border-[#EAE0A8] pt-3">
        <div>
          <p className="text-xs text-gray-400">基本月謝</p>
          <p className="text-sm font-semibold text-gray-600">
            {summary.baseFee != null ? `¥${summary.baseFee.toLocaleString()}` : '未設定'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">今月の月謝</p>
          {summary.totalFee != null ? (
            <p className="text-xl font-bold text-[#1A3666]">¥{summary.totalFee.toLocaleString()}</p>
          ) : (
            <p className="text-sm font-semibold text-amber-600">月謝未設定</p>
          )}
        </div>
      </div>

      {/* 支払い済み情報 */}
      {isPaid && summary.payment && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">
          <p>支払額: ¥{summary.payment.amount.toLocaleString()}</p>
          <p>
            支払日:{' '}
            {new Date(summary.payment.paidAt).toLocaleDateString('ja-JP', {
              timeZone: 'Asia/Tokyo', year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
        </div>
      )}

      {/* アクションボタン */}
      {!isPaid ? (
        <button
          type="button"
          disabled={isPending || summary.totalFee == null}
          onClick={handlePay}
          className="w-full py-2 text-sm font-bold bg-[#1A3666] text-white rounded-xl hover:bg-[#2A52A0] disabled:opacity-40 transition-colors"
        >
          {isPending ? '処理中...' : '支払い済みにする'}
        </button>
      ) : (
        <button
          type="button"
          disabled={isPending}
          onClick={handleUnpay}
          className="w-full py-2 text-sm font-semibold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          {isPending ? '処理中...' : '未払いに戻す'}
        </button>
      )}
    </div>
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
  const unpaidCount = summaries.length - paidCount
  const totalAmount = summaries.reduce((sum, s) => sum + (s.totalFee ?? 0), 0)
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
        <h2 className="text-base font-bold text-[#1A3666]">{year}年{month}月</h2>
        <a href={nextHref} className="p-2 text-[#1A3666] hover:bg-[#F5F8FF] rounded-lg transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-[#EAE0A8] p-4 text-center">
          <p className="text-xs font-semibold text-gray-500 mb-1">対象メンバー</p>
          <p className="text-xl font-bold text-[#1A3666]">{summaries.length}<span className="text-sm ml-0.5">名</span></p>
        </div>
        <div className="bg-white rounded-xl border border-green-300 p-4 text-center">
          <p className="text-xs font-semibold text-gray-500 mb-1">支払済み</p>
          <p className="text-xl font-bold text-green-700">{paidCount}<span className="text-sm ml-0.5">名</span></p>
        </div>
        <div className="bg-white rounded-xl border border-amber-300 p-4 text-center">
          <p className="text-xs font-semibold text-gray-500 mb-1">未払い</p>
          <p className="text-xl font-bold text-amber-600">{unpaidCount}<span className="text-sm ml-0.5">名</span></p>
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
