'use client'

import { useState, useTransition } from 'react'
import { updateCoachRate } from '../actions'

type Coach = {
  id: string
  name: string
  photoUrl: string | null
  ratePractice: number | null
  rateTournament: number | null
}

function CoachRateRow({ coach }: { coach: Coach }) {
  const [isPending, startTransition] = useTransition()
  const [practice, setPractice] = useState(coach.ratePractice?.toString() ?? '')
  const [tournament, setTournament] = useState(coach.rateTournament?.toString() ?? '')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const practiceVal = practice.trim() ? parseInt(practice.trim(), 10) : null
  const tournamentVal = tournament.trim() ? parseInt(tournament.trim(), 10) : null

  const isDirty =
    practiceVal !== coach.ratePractice ||
    tournamentVal !== coach.rateTournament

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await updateCoachRate(coach.id, practiceVal, tournamentVal)
      if (result.error) { setError(result.error); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div className="bg-white rounded-xl border border-[#EAE0A8] p-4">
      {/* コーチ名 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-[#F5C800]/20 border-2 border-[#F5C800] flex items-center justify-center overflow-hidden shrink-0">
          {coach.photoUrl
            ? <img src={coach.photoUrl} alt={coach.name} className="w-full h-full object-cover" />
            : <span className="text-base">👤</span>}
        </div>
        <p className="font-bold text-[#1A3666]">{coach.name}</p>
      </div>

      {/* 単価入力 */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">練習（1回あたり）</label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min="0"
              step="100"
              value={practice}
              onChange={e => { setPractice(e.target.value); setError(null) }}
              placeholder="例: 3000"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white"
            />
            <span className="text-sm text-gray-500 shrink-0">円</span>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">大会帯同（1回あたり）</label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min="0"
              step="100"
              value={tournament}
              onChange={e => { setTournament(e.target.value); setError(null) }}
              placeholder="未確認"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white"
            />
            <span className="text-sm text-gray-500 shrink-0">円</span>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</p>
      )}

      <button
        type="button"
        disabled={isPending || !isDirty}
        onClick={handleSave}
        className={`w-full py-2 text-sm font-bold rounded-xl transition-colors disabled:opacity-40 ${
          saved
            ? 'bg-green-600 text-white'
            : 'bg-[#1A3666] text-white hover:bg-[#2A52A0]'
        }`}
      >
        {isPending ? '保存中...' : saved ? '保存しました ✓' : '保存する'}
      </button>
    </div>
  )
}

export default function CoachRateList({ coaches }: { coaches: Coach[] }) {
  if (coaches.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#EAE0A8] p-8 text-center text-gray-400 text-sm">
        指導者が登録されていません
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {coaches.map(coach => (
        <CoachRateRow key={coach.id} coach={coach} />
      ))}
    </div>
  )
}
