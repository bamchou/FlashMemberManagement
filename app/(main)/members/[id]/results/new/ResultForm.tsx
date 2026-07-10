'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { createTournamentResult, type ResultFormState } from '../actions'

const EVENT_TYPES = ['シングルス', 'ダブルス', '混合ダブルス', '団体戦']

export default function ResultForm({ memberId }: { memberId: string }) {
  const boundCreate = createTournamentResult.bind(null, memberId)
  const [state, action, pending] = useActionState<ResultFormState, FormData>(
    boundCreate,
    undefined
  )
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]

  return (
    <form action={action} className="space-y-5">
      {/* 大会名 */}
      <div>
        <label htmlFor="tournament_name" className="block text-sm font-semibold text-[#1A3666] mb-1.5">
          大会名<span className="text-red-500 ml-1">*</span>
        </label>
        <input
          id="tournament_name"
          name="tournament_name"
          type="text"
          required
          placeholder="例: 県中学校秋季バドミントン大会"
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white"
        />
      </div>

      {/* 大会日付 */}
      <div>
        <label htmlFor="tournament_date" className="block text-sm font-semibold text-[#1A3666] mb-1.5">
          大会日付<span className="text-red-500 ml-1">*</span>
        </label>
        <input
          id="tournament_date"
          name="tournament_date"
          type="date"
          required
          max={today}
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white"
        />
      </div>

      {/* 種目 */}
      <div>
        <label htmlFor="event_type" className="block text-sm font-semibold text-[#1A3666] mb-1.5">
          種目<span className="text-red-500 ml-1">*</span>
        </label>
        <select
          id="event_type"
          name="event_type"
          required
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white"
        >
          <option value="">選択してください</option>
          {EVENT_TYPES.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* 成績 */}
      <div>
        <label htmlFor="result" className="block text-sm font-semibold text-[#1A3666] mb-1.5">
          成績
        </label>
        <input
          id="result"
          name="result"
          type="text"
          placeholder="例: 優勝 / 準優勝 / 3位 / ベスト8"
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white"
        />
      </div>

      {/* 特記事項（ラジオボタン） */}
      <div className="bg-[#FFFDF0] border border-[#EAE0A8] rounded-lg p-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">特記事項（いずれか1つ）</p>
        <div className="space-y-2.5">
          {[
            { value: 'none',        label: 'なし' },
            { value: 'prefectural', label: '県大会進出' },
            { value: 'kyushu',      label: '九州大会進出' },
          ].map(({ value, label }) => (
            <label key={value} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="radio"
                name="special_note"
                value={value}
                defaultChecked={value === 'none'}
                className="w-4 h-4 border-gray-300 text-[#1A3666] focus:ring-[#1A3666] cursor-pointer"
              />
              <span className="text-sm text-gray-700 group-hover:text-[#1A3666] transition-colors">
                {label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {state?.error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
          {state.error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 border border-gray-300 text-gray-600 font-semibold py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 bg-[#1A3666] text-white font-bold py-2.5 rounded-lg text-sm hover:bg-[#2A52A0] transition-colors disabled:opacity-60"
        >
          {pending ? '登録中...' : '登録する'}
        </button>
      </div>
    </form>
  )
}
