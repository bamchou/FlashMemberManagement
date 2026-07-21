'use client'

import { useState, useTransition } from 'react'
import { updateMemberFrequency } from '../../dues/actions'

const ALL_DAYS = ['月', '火', '水', '木', '金', '土', '日']

type MemberFreq = {
  id: string
  name: string
  photoUrl: string | null
  frequency: number | null
  practiceDays: string[]
}

function FrequencyRow({ member }: { member: MemberFreq }) {
  const [editing, setEditing] = useState(false)
  const [frequency, setFrequency] = useState<number | null>(member.frequency)
  const [practiceDays, setPracticeDays] = useState<string[]>(member.practiceDays)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function toggleDay(day: string) {
    setPracticeDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await updateMemberFrequency(member.id, frequency, practiceDays)
      if (result?.error) {
        setError(result.error)
      } else {
        setEditing(false)
      }
    })
  }

  function handleCancel() {
    setFrequency(member.frequency)
    setPracticeDays(member.practiceDays)
    setError(null)
    setEditing(false)
  }

  if (!editing) {
    return (
      <div className="bg-white rounded-xl border border-[#EAE0A8] px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[#F5C800]/20 border-2 border-[#F5C800] flex items-center justify-center overflow-hidden shrink-0">
          {member.photoUrl
            ? <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
            : <span className="text-sm">👤</span>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#1A3666] truncate">{member.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {member.frequency != null ? `週${member.frequency}回` : '頻度未設定'}
            {member.practiceDays.length > 0 && `　${member.practiceDays.join('・')}曜`}
          </p>
        </div>
        {member.frequency == null && (
          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded-full shrink-0">未設定</span>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="shrink-0 text-xs font-semibold text-[#1A3666] border border-[#1A3666] px-3 py-1.5 rounded-lg hover:bg-[#1A3666] hover:text-white transition-colors"
        >
          変更
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-[#1A3666] p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[#F5C800]/20 border-2 border-[#F5C800] flex items-center justify-center overflow-hidden shrink-0">
          {member.photoUrl
            ? <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
            : <span className="text-sm">👤</span>}
        </div>
        <p className="text-sm font-bold text-[#1A3666]">{member.name}</p>
      </div>

      {/* 練習頻度 */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-2">練習頻度</label>
        <select
          value={frequency ?? ''}
          onChange={e => setFrequency(e.target.value ? Number(e.target.value) : null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] bg-white"
        >
          <option value="">未設定</option>
          {[1, 2, 3, 4, 5].map(n => (
            <option key={n} value={n}>週{n}回</option>
          ))}
        </select>
      </div>

      {/* 参加曜日 */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-2">主な参加曜日</label>
        <div className="flex gap-2 flex-wrap">
          {ALL_DAYS.map(day => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={`w-9 h-9 rounded-full text-sm font-bold transition-colors ${
                practiceDays.includes(day)
                  ? 'bg-[#1A3666] text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-red-600 text-xs">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isPending}
          className="flex-none px-4 py-2 text-sm font-semibold text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="flex-1 py-2 text-sm font-bold bg-[#1A3666] text-white rounded-lg hover:bg-[#2A52A0] disabled:opacity-50 transition-colors"
        >
          {isPending ? '保存中...' : '保存する'}
        </button>
      </div>
    </div>
  )
}

export default function FrequencyClient({ members }: { members: MemberFreq[] }) {
  const [nameFilter, setNameFilter] = useState('')
  const [freqFilter, setFreqFilter] = useState<string>('')

  const unsetCount = members.filter(m => m.frequency == null).length

  const filtered = members.filter(m => {
    if (nameFilter && !m.name.includes(nameFilter)) return false
    if (freqFilter === 'unset') return m.frequency == null
    if (freqFilter !== '') return m.frequency === Number(freqFilter)
    return true
  })

  return (
    <div className="space-y-4">
      {unsetCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
          練習頻度が未設定のメンバーが <strong>{unsetCount}名</strong> います。月謝の確定にはすべての設定が必要です。
        </div>
      )}

      {/* フィルタ */}
      <div className="flex gap-2">
        <input
          type="text"
          value={nameFilter}
          onChange={e => setNameFilter(e.target.value)}
          placeholder="名前で絞り込み"
          className="flex-1 px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white"
        />
        <select
          value={freqFilter}
          onChange={e => setFreqFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white"
        >
          <option value="">すべての頻度</option>
          <option value="unset">未設定</option>
          {[1, 2, 3, 4, 5].map(n => (
            <option key={n} value={n}>週{n}回</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#EAE0A8] p-8 text-center text-gray-400 text-sm">
          該当するメンバーがいません
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(m => (
            <FrequencyRow key={m.id} member={m} />
          ))}
        </div>
      )}
    </div>
  )
}
