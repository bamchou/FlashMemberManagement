'use client'

import { useState } from 'react'
import Link from 'next/link'
import { calculateGrade } from '@/lib/utils/grade'
import BibStatusButton from './BibStatusButton'

type BibRow = {
  id: string
  member_id: string
  status: 'requested' | 'ordered' | 'delivered'
  requested_at: string
  ordered_at: string | null
  delivered_at: string | null
  members: {
    full_name: string
    full_name_kana: string | null
    birth_date: string
    gender: string | null
    photo_url: string | null
  } | null
}

type Tab = 'requested' | 'ordered' | 'delivered'

const TAB_CONFIG: { value: Tab; label: string; emptyMsg: string }[] = [
  { value: 'requested', label: '依頼中',       emptyMsg: '依頼中のゼッケンはありません' },
  { value: 'ordered',   label: '発注済み',     emptyMsg: '発注済みのゼッケンはありません' },
  { value: 'delivered', label: '渡し済み（完了）', emptyMsg: '渡し済みのゼッケンはありません' },
]

function formatDate(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

export default function BibManagementClient({ rows }: { rows: BibRow[] }) {
  const [tab, setTab] = useState<Tab>('requested')

  const counts = {
    requested: rows.filter(r => r.status === 'requested').length,
    ordered:   rows.filter(r => r.status === 'ordered').length,
    delivered: rows.filter(r => r.status === 'delivered').length,
  }

  const filtered = rows.filter(r => r.status === tab)

  return (
    <div>
      {/* タブ */}
      <div className="flex gap-2 mb-5 border-b border-[#EAE0A8]">
        {TAB_CONFIG.map(t => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              tab === t.value
                ? 'border-[#1A3666] text-[#1A3666]'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {t.label}
            {counts[t.value] > 0 && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                tab === t.value ? 'bg-[#1A3666] text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {counts[t.value]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* リスト */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#EAE0A8] py-16 text-center">
          <p className="text-gray-400 text-sm">{TAB_CONFIG.find(t => t.value === tab)?.emptyMsg}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(row => {
            const m = row.members
            return (
              <div key={row.id} className="bg-white rounded-xl border border-[#EAE0A8] p-4 flex items-center gap-4">
                {/* 写真 */}
                <div className="w-10 h-14 rounded-lg bg-[#F5C800]/20 border border-[#F5C800] flex items-center justify-center shrink-0 overflow-hidden">
                  {m?.photo_url
                    ? <img src={m.photo_url} alt={m?.full_name ?? ''} className="w-full h-full object-cover object-top" />
                    : <span className="text-lg">👤</span>}
                </div>

                {/* 情報 */}
                <div className="flex-1 min-w-0">
                  <Link href={`/members/${row.member_id}`} className="font-bold text-[#1A3666] hover:underline">
                    {m?.full_name ?? '不明'}
                  </Link>
                  {m?.full_name_kana && (
                    <span className="text-xs text-gray-400 ml-1.5">{m.full_name_kana}</span>
                  )}
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    {m?.birth_date && (
                      <span className="text-xs text-gray-500">{calculateGrade(m.birth_date)}</span>
                    )}
                    {m?.gender && (
                      <span className="text-xs text-gray-500">{m.gender}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    依頼日: {formatDate(row.requested_at)}
                    {row.ordered_at && <> &nbsp;／&nbsp; 発注日: {formatDate(row.ordered_at)}</>}
                    {row.delivered_at && <> &nbsp;／&nbsp; 渡し日: {formatDate(row.delivered_at)}</>}
                  </p>
                </div>

                {/* アクション */}
                <div className="shrink-0">
                  {row.status === 'requested' && (
                    <BibStatusButton
                      requestId={row.id}
                      newStatus="ordered"
                      label="発注済みにする"
                      className="bg-blue-600 text-white hover:bg-blue-700"
                    />
                  )}
                  {row.status === 'ordered' && (
                    <BibStatusButton
                      requestId={row.id}
                      newStatus="delivered"
                      label="渡し済みにする"
                      className="bg-green-600 text-white hover:bg-green-700"
                    />
                  )}
                  {row.status === 'delivered' && (
                    <span className="text-xs font-bold text-green-700 bg-green-50 border border-green-300 px-3 py-1.5 rounded-lg">
                      ゼッケン作成済み
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
