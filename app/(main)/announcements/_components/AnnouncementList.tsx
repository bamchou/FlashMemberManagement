'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/grade'
import type { Role, Announcement } from '@/lib/types'
import DeleteButton from './DeleteButton'
import PinButton from './PinButton'

function getPublishStatus(a: Announcement, today: string): 'active' | 'before' | 'ended' {
  if (a.publish_start && today < a.publish_start) return 'before'
  if (a.publish_end && today > a.publish_end) return 'ended'
  return 'active'
}

const TARGET_LABEL: Record<string, { label: string; className: string }> = {
  coach:  { label: '指導者のみ', className: 'bg-[#1A3666] text-white' },
  member: { label: '保護者のみ', className: 'bg-[#F5C800] text-[#1A3666]' },
}

const TARGET_FILTERS = [
  { value: '',       label: 'すべて' },
  { value: 'all',    label: '全員' },
  { value: 'coach',  label: '指導者のみ' },
  { value: 'member', label: '保護者のみ' },
]

const STATUS_FILTERS = [
  { value: 'not_ended', label: '終了以外' },
  { value: '',          label: 'すべて' },
  { value: 'active',    label: '公開中' },
  { value: 'before',    label: '公開前' },
  { value: 'ended',     label: '公開終了' },
]

export default function AnnouncementList({
  announcements,
  role,
  today,
  readIds = [],
  currentUserId,
}: {
  announcements: Announcement[]
  role: Role
  today: string
  readIds?: string[]
  currentUserId?: string
}) {
  const isAdmin = role === 'admin'
  const readSet = useMemo(() => new Set(readIds), [readIds])
  const [keyword, setKeyword] = useState('')
  const [targetFilter, setTargetFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState(isAdmin ? 'not_ended' : '')
  const [typeTab, setTypeTab] = useState<'normal' | 'always'>('normal')

  const normalCount = useMemo(
    () => announcements.filter(a => (a.announcement_type ?? 'normal') === 'normal').length,
    [announcements]
  )
  const alwaysCount = useMemo(
    () => announcements.filter(a => a.announcement_type === 'always').length,
    [announcements]
  )

  const filtered = useMemo(() => {
    const list = announcements.filter(a => {
      if ((a.announcement_type ?? 'normal') !== typeTab) return false
      if (targetFilter && a.target !== targetFilter) return false
      if (statusFilter === 'not_ended' && getPublishStatus(a, today) === 'ended') return false
      else if (statusFilter && statusFilter !== 'not_ended' && getPublishStatus(a, today) !== statusFilter) return false
      if (keyword.trim()) {
        const kw = keyword.trim().toLowerCase()
        if (!a.title.toLowerCase().includes(kw) && !a.content.toLowerCase().includes(kw)) return false
      }
      return true
    })
    // 通常タブはピン止めを上部に固定（それ以外は元の並び=登録日時の新しい順を維持）
    if (typeTab === 'normal') {
      return list.slice().sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned))
    }
    return list
  }, [announcements, typeTab, targetFilter, statusFilter, keyword, today])

  return (
    <div>
      {/* お知らせ種別タブ */}
      <div className="flex gap-1 mb-4 border-b border-[#EAE0A8]">
        {([
          { key: 'normal', label: '通常', count: normalCount },
          { key: 'always', label: '常時', count: alwaysCount },
        ] as const).map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setTypeTab(tab.key)}
            className={`px-5 py-2 text-sm font-semibold border-b-2 transition-colors ${
              typeTab === tab.key
                ? 'border-[#1A3666] text-[#1A3666]'
                : 'border-transparent text-gray-400 hover:text-[#1A3666]'
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs text-gray-400">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* フィルタエリア */}
      <div className="bg-white rounded-xl border border-[#EAE0A8] p-4 mb-4 space-y-3">
        {/* キーワード検索 */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
          </span>
          <input
            type="text"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="タイトル・本文を検索"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent"
          />
          {keyword && (
            <button
              type="button"
              onClick={() => setKeyword('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          )}
        </div>

        {/* 対象フィルタ（管理者のみ） */}
        {isAdmin && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-500 shrink-0">対象:</span>
            {TARGET_FILTERS.map(f => (
              <button
                key={f.value}
                type="button"
                onClick={() => setTargetFilter(f.value)}
                className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${
                  targetFilter === f.value
                    ? 'bg-[#1A3666] text-white border-[#1A3666]'
                    : 'bg-white text-gray-500 border-gray-300 hover:border-[#1A3666] hover:text-[#1A3666]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* 公開状態フィルタ（管理者のみ） */}
        {isAdmin && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-500 shrink-0">公開状態:</span>
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${
                  statusFilter === f.value
                    ? 'bg-[#1A3666] text-white border-[#1A3666]'
                    : 'bg-white text-gray-500 border-gray-300 hover:border-[#1A3666] hover:text-[#1A3666]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 件数表示 */}
      {(keyword || targetFilter || statusFilter) && (
        <p className="text-xs text-gray-500 mb-3">
          {filtered.length} 件表示
          <button
            type="button"
            onClick={() => { setKeyword(''); setTargetFilter(''); setStatusFilter('') }}
            className="ml-2 text-[#1A3666] underline hover:no-underline"
          >
            フィルタをリセット
          </button>
        </p>
      )}

      {/* 一覧 */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map(a => {
            const status = getPublishStatus(a, today)
            const targetInfo = TARGET_LABEL[a.target]
            const isUnread = a.created_by !== currentUserId && !readSet.has(a.id)
            return (
              <div key={a.id} className="relative">
                <div
                  className={`rounded-xl p-[2px] hover:shadow-sm transition-all ${
                    a.target === 'coach'  ? 'bg-[#1A3666]' :
                    a.target === 'member' ? 'bg-[#F5C800]' :
                    'bg-[#F97316]'
                  }`}
                >
                  <div className="bg-white rounded-[10px]">
                    <Link href={`/announcements/${a.id}`} className={`block p-5 ${isAdmin ? 'pr-28' : ''}`}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-semibold text-gray-400 shrink-0">No.{a.seq}</span>
                        {isUnread && (
                          <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full shrink-0" title="未確認" aria-label="未確認">未</span>
                        )}
                        {typeTab === 'normal' && a.is_pinned && (
                          <span className="text-sm shrink-0" title="ピン止め" aria-label="ピン止め">📌</span>
                        )}
                        <p className="font-bold text-[#1A3666]">{a.title}</p>
                        {targetInfo && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${targetInfo.className}`}>
                            {targetInfo.label}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{formatDate(a.created_at.split('T')[0])}</p>
                      {isAdmin && (a.publish_start || a.publish_end) && (
                        <p className="text-xs text-gray-400 mt-1">
                          公開期間: {a.publish_start ? formatDate(a.publish_start) : '開始日なし'} 〜 {a.publish_end ? formatDate(a.publish_end) : '終了日なし'}
                        </p>
                      )}
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2 leading-relaxed">{a.content}</p>
                    </Link>
                  </div>
                </div>

                {isAdmin && (
                  <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                    {status === 'before' && (
                      <span className="text-xs font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">公開前</span>
                    )}
                    {status === 'ended' && (
                      <span className="text-xs font-semibold bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">公開終了</span>
                    )}
                    {typeTab === 'normal' && <PinButton id={a.id} isPinned={a.is_pinned} />}
                    <DeleteButton id={a.id} title={a.title} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#EAE0A8] py-16 text-center">
          <p className="text-gray-400 text-sm">
            {keyword || targetFilter || statusFilter ? '条件に一致するお知らせがありません' : 'お知らせはまだありません'}
          </p>
        </div>
      )}
    </div>
  )
}
