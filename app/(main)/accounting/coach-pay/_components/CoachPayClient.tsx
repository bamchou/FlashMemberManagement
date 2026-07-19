'use client'

import { useTransition } from 'react'
import { markCoachPaid, markCoachUnpaid } from '../actions'

export type CoachSummary = {
  id: string
  name: string
  ratePractice: number | null
  rateTournament: number | null
  practiceCount: number
  tournamentCount: number
  totalAmount: number
  hasMissingRate: boolean
  payment: { amount: number; paidAt: string; paidBy: string } | null
}

function CoachRow({
  summary,
  year,
  month,
}: {
  summary: CoachSummary
  year: number
  month: number
}) {
  const [isPending, startTransition] = useTransition()
  const isPaid = !!summary.payment

  function handlePay() {
    if (!confirm(`${summary.name}さんの${year}年${month}月分（¥${summary.totalAmount.toLocaleString()}）を支払い済みにしますか？`)) return
    startTransition(async () => {
      await markCoachPaid(summary.id, year, month, summary.totalAmount)
    })
  }

  function handleUnpay() {
    if (!confirm(`${summary.name}さんの支払い済み記録を取り消しますか？`)) return
    startTransition(async () => {
      await markCoachUnpaid(summary.id, year, month)
    })
  }

  return (
    <div className={`bg-white rounded-xl border p-5 space-y-4 ${isPaid ? 'border-green-300' : 'border-[#EAE0A8]'}`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="font-bold text-[#1A3666]">{summary.name}</p>
          {summary.hasMissingRate && (
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded-full">単価未設定</span>
          )}
        </div>
        {isPaid ? (
          <span className="text-xs font-bold text-green-700 bg-green-50 border border-green-300 px-2.5 py-1 rounded-full">支払済み</span>
        ) : (
          <span className="text-xs font-bold text-gray-400 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">未払い</span>
        )}
      </div>

      {/* 参加実績 */}
      <div className="space-y-1.5 text-sm">
        {summary.practiceCount > 0 || summary.ratePractice != null ? (
          <div className="flex items-center justify-between text-gray-600">
            <span>練習　{summary.practiceCount}回 × {summary.ratePractice != null ? `¥${summary.ratePractice.toLocaleString()}` : '単価未設定'}</span>
            <span className="font-semibold text-[#1A3666]">
              {summary.ratePractice != null
                ? `¥${(summary.practiceCount * summary.ratePractice).toLocaleString()}`
                : '—'}
            </span>
          </div>
        ) : null}
        {summary.tournamentCount > 0 || summary.rateTournament != null ? (
          <div className="flex items-center justify-between text-gray-600">
            <span>大会帯同　{summary.tournamentCount}回 × {summary.rateTournament != null ? `¥${summary.rateTournament.toLocaleString()}` : '単価未設定'}</span>
            <span className="font-semibold text-[#1A3666]">
              {summary.rateTournament != null
                ? `¥${(summary.tournamentCount * summary.rateTournament).toLocaleString()}`
                : '—'}
            </span>
          </div>
        ) : null}
        {summary.practiceCount === 0 && summary.tournamentCount === 0 && (
          <p className="text-gray-400 text-xs">この月の参加実績なし</p>
        )}
      </div>

      {/* 合計 */}
      <div className="flex items-center justify-between border-t border-[#EAE0A8] pt-3">
        <span className="text-sm font-bold text-[#1A3666]">合計</span>
        <span className="text-lg font-bold text-[#1A3666]">¥{summary.totalAmount.toLocaleString()}</span>
      </div>

      {/* 支払い済み情報 */}
      {isPaid && summary.payment && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700 space-y-0.5">
          <p>支払額: ¥{summary.payment.amount.toLocaleString()}</p>
          <p>
            支払日: {new Date(summary.payment.paidAt).toLocaleDateString('ja-JP', {
              timeZone: 'Asia/Tokyo', year: 'numeric', month: 'long', day: 'numeric',
            })}
            　担当: {summary.payment.paidBy}
          </p>
        </div>
      )}

      {/* アクションボタン */}
      <div className="flex gap-2">
        {!isPaid ? (
          <button
            type="button"
            disabled={isPending || summary.totalAmount === 0}
            onClick={handlePay}
            className="flex-1 py-2 text-sm font-bold bg-[#1A3666] text-white rounded-xl hover:bg-[#2A52A0] disabled:opacity-40 transition-colors"
          >
            {isPending ? '処理中...' : '支払い済みにする'}
          </button>
        ) : (
          <button
            type="button"
            disabled={isPending}
            onClick={handleUnpay}
            className="flex-1 py-2 text-sm font-semibold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            {isPending ? '処理中...' : '未払いに戻す'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function CoachPayClient({
  year,
  month,
  summaries,
  prevHref,
  nextHref,
}: {
  year: number
  month: number
  summaries: CoachSummary[]
  prevHref: string
  nextHref: string
}) {
  const paidCount = summaries.filter(s => s.payment).length
  const unpaidCount = summaries.length - paidCount
  const totalAmount = summaries.reduce((sum, s) => sum + s.totalAmount, 0)
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
          <p className="text-xs font-semibold text-gray-500 mb-1">指導者数</p>
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
          <p className="text-xs font-semibold text-gray-500">今月の合計バイト代</p>
          <p className="text-2xl font-bold text-[#1A3666] mt-0.5">¥{totalAmount.toLocaleString()}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-gray-500">うち支払済み</p>
          <p className="text-lg font-bold text-green-700 mt-0.5">¥{paidAmount.toLocaleString()}</p>
        </div>
      </div>

      {/* コーチ一覧 */}
      {summaries.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#EAE0A8] p-8 text-center text-gray-400 text-sm">
          指導者が登録されていません
        </div>
      ) : (
        <div className="space-y-3">
          {summaries.map(s => (
            <CoachRow key={s.id} summary={s} year={year} month={month} />
          ))}
        </div>
      )}
    </div>
  )
}
