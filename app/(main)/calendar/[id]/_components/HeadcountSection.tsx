'use client'

import { useState, useTransition } from 'react'
import { upsertAttendance, removeAttendance } from '../../actions'
import Spinner from '@/app/(main)/_components/Spinner'

export type Attendee = {
  userId: string
  name: string
  adult: number
  child: number
  isSelf: boolean
}

export default function HeadcountSection({
  eventId,
  myAdult,
  myChild,
  attendees,
  adultFee,
  childFee,
  isAdminOrCoach,
  isPast,
}: {
  eventId: string
  myAdult: number
  myChild: number
  attendees: Attendee[]
  adultFee: number | null
  childFee: number | null
  isAdminOrCoach: boolean
  isPast: boolean
}) {
  const [adult, setAdult] = useState(String(myAdult))
  const [child, setChild] = useState(String(myChild))
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isRegistered = myAdult > 0 || myChild > 0

  const totalAdult = attendees.reduce((s, a) => s + a.adult, 0)
  const totalChild = attendees.reduce((s, a) => s + a.child, 0)
  const totalPeople = totalAdult + totalChild
  const totalAmount = totalAdult * (adultFee ?? 0) + totalChild * (childFee ?? 0)
  const hasFee = adultFee != null || childFee != null

  function save() {
    const a = parseInt(adult, 10) || 0
    const c = parseInt(child, 10) || 0
    setError(null)
    startTransition(async () => {
      const res = await upsertAttendance(eventId, a, c)
      if (res?.error) setError(res.error)
    })
  }

  function cancel() {
    if (!confirm('参加の登録を取り消しますか？')) return
    setError(null)
    startTransition(async () => {
      const res = await removeAttendance(eventId)
      if (res?.error) setError(res.error)
      else { setAdult('0'); setChild('0') }
    })
  }

  function personAmount(a: number, c: number): number {
    return a * (adultFee ?? 0) + c * (childFee ?? 0)
  }

  return (
    <div className="bg-white rounded-xl border border-[#EAE0A8] p-6">
      <h2 className="text-base font-bold text-[#1A3666] mb-4">
        参加人数
        <span className="ml-2 text-sm font-semibold text-gray-400">
          （大人 {totalAdult}人・子供 {totalChild}人 / 計 {totalPeople}人）
        </span>
      </h2>

      {/* 自分の人数登録 */}
      {!isPast ? (
        <div className="mb-5 bg-[#F5F8FF] border border-[#D0DCF5] rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 mb-3">参加人数を登録</p>
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <label className="block text-xs font-semibold text-[#1A3666] mb-1">大人</label>
              <div className="relative w-24">
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={adult}
                  onChange={e => setAdult(e.target.value)}
                  className="w-full px-3 py-2 pr-7 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-500">人</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1A3666] mb-1">子供</label>
              <div className="relative w-24">
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={child}
                  onChange={e => setChild(e.target.value)}
                  className="w-full px-3 py-2 pr-7 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-500">人</span>
              </div>
            </div>
            <button
              type="button"
              disabled={isPending}
              onClick={save}
              className="inline-flex items-center justify-center gap-1.5 py-2 px-5 bg-[#1A3666] text-white text-sm font-bold rounded-lg hover:bg-[#2A52A0] disabled:opacity-50 transition-colors"
            >
              {isPending && <Spinner className="w-4 h-4" />}
              {isPending ? '処理中...' : isRegistered ? '更新する' : '登録する'}
            </button>
            {isRegistered && (
              <button
                type="button"
                disabled={isPending}
                onClick={cancel}
                className="py-2 px-4 text-sm font-semibold text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors"
              >
                取消
              </button>
            )}
          </div>
          {hasFee && (
            <p className="text-xs text-gray-500 mt-3">
              参加費：大人 {(adultFee ?? 0).toLocaleString()}円 / 子供 {(childFee ?? 0).toLocaleString()}円
            </p>
          )}
          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        </div>
      ) : (
        <p className="text-xs text-gray-400 mb-4 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
          終了した予定のため人数の変更はできません
        </p>
      )}

      {/* 参加者一覧 */}
      {attendees.length > 0 ? (
        <div className="space-y-2">
          {attendees.map(a => (
            <div
              key={a.userId}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                a.isSelf ? 'bg-green-50 border-green-300' : 'bg-[#F5F8FF] border-[#D0DCF5]'
              }`}
            >
              <span className="text-sm font-semibold text-[#1A3666] flex-1 truncate">
                {a.name}{a.isSelf && <span className="ml-1 text-xs text-green-700">(自分)</span>}
              </span>
              <span className="text-xs font-semibold text-gray-600 shrink-0">
                大人 {a.adult}人・子供 {a.child}人
              </span>
              {isAdminOrCoach && hasFee && (
                <span className="text-xs font-bold text-green-700 shrink-0 w-20 text-right">
                  ¥{personAmount(a.adult, a.child).toLocaleString()}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-4">まだ参加登録がありません</p>
      )}

      {/* 管理者向け参加費集計 */}
      {isAdminOrCoach && hasFee && attendees.length > 0 && (
        <div className="mt-5 pt-4 border-t border-[#EAE0A8]">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">参加費集計</p>
          <div className="text-sm text-[#1A3666] space-y-1">
            <div className="flex justify-between">
              <span>大人 {totalAdult}人 × {(adultFee ?? 0).toLocaleString()}円</span>
              <span className="font-semibold">¥{(totalAdult * (adultFee ?? 0)).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>子供 {totalChild}人 × {(childFee ?? 0).toLocaleString()}円</span>
              <span className="font-semibold">¥{(totalChild * (childFee ?? 0)).toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-gray-100 text-base font-bold text-green-700">
              <span>合計</span>
              <span>¥{totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
