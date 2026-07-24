'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { calculateGrade, formatYearMonth } from '@/lib/utils/grade'
import type { Role, Member } from '@/lib/types'
import VisibilityToggle from './VisibilityToggle'
import TappablePhoto from './TappablePhoto'
import RejoinButton from './RejoinButton'

type GradeCategory = '' | 'elementary' | 'middle' | 'high' | 'graduated'
type VisibilityFilter = '' | 'visible' | 'hidden'
type GenderFilter = '' | '男' | '女'

const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日'] as const

function isNewMember(joinDateStr: string): boolean {
  const twoMonthsAgo = new Date()
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)
  return new Date(joinDateStr) >= twoMonthsAgo
}

function formatWithdrawalLabel(withdrawnAt: string): string {
  const jst = new Date(new Date(withdrawnAt).getTime() + 9 * 60 * 60 * 1000)
  return `${jst.getUTCFullYear()}年${jst.getUTCMonth() + 1}月退会`
}

function getGradeCategory(birthDateStr: string): GradeCategory {
  const birth = new Date(birthDateStr)
  const today = new Date()
  const currentSchoolYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1
  const month = birth.getMonth() + 1
  const day = birth.getDate()
  const birthCohortYear = month > 4 || (month === 4 && day >= 2) ? birth.getFullYear() + 1 : birth.getFullYear()
  const gradeNum = currentSchoolYear - birthCohortYear - 5
  if (gradeNum <= 0) return 'elementary'
  if (gradeNum <= 6) return 'elementary'
  if (gradeNum <= 9) return 'middle'
  if (gradeNum <= 12) return 'high'
  return 'graduated'
}

const GRADE_FILTERS: { value: GradeCategory; label: string }[] = [
  { value: '',           label: 'すべて' },
  { value: 'elementary', label: '小学生' },
  { value: 'middle',     label: '中学生' },
  { value: 'high',       label: '高校生' },
  { value: 'graduated',  label: '高校卒業' },
]

const GENDER_FILTERS: { value: GenderFilter; label: string }[] = [
  { value: '',  label: 'すべて' },
  { value: '男', label: '男' },
  { value: '女', label: '女' },
]

const VISIBILITY_FILTERS: { value: VisibilityFilter; label: string }[] = [
  { value: '',        label: 'すべて' },
  { value: 'visible', label: '表示中' },
  { value: 'hidden',  label: '非表示' },
]

function FilterPills<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-semibold text-gray-500 shrink-0">{label}:</span>
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${
            value === o.value
              ? 'bg-[#1A3666] text-white border-[#1A3666]'
              : 'bg-white text-gray-500 border-gray-300 hover:border-[#1A3666] hover:text-[#1A3666]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function MultiFilterPills({
  label,
  options,
  values,
  onChange,
}: {
  label: string
  options: string[]
  values: string[]
  onChange: (v: string[]) => void
}) {
  function toggle(v: string) {
    onChange(values.includes(v) ? values.filter(x => x !== v) : [...values, v])
  }
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-semibold text-gray-500 shrink-0">{label}:</span>
      {options.map(o => (
        <button
          key={o}
          type="button"
          onClick={() => toggle(o)}
          className={`text-xs font-semibold w-8 h-7 rounded-full border transition-colors ${
            values.includes(o)
              ? 'bg-[#1A3666] text-white border-[#1A3666]'
              : 'bg-white text-gray-500 border-gray-300 hover:border-[#1A3666] hover:text-[#1A3666]'
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

export default function MemberList({
  members,
  myMembers = [],
  role,
  totalCount,
}: {
  members: Member[]
  myMembers?: Member[]
  role: Role
  totalCount: number
}) {
  const isAdmin = role === 'admin'
  const isAdminOrCoach = role === 'admin' || role === 'coach'
  const myMemberIds = new Set(myMembers.map(m => m.id))

  // 退会済みメンバーは末尾に別表示するため分離
  const activeMembers = members.filter(m => !m.withdrawn_at)
  const withdrawnMembers = members.filter(m => !!m.withdrawn_at)

  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [gradeFilter, setGradeFilter] = useState<GradeCategory>('')
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('')
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>(isAdmin ? 'visible' : '')
  const [practiceDaysFilter, setPracticeDaysFilter] = useState<string[]>([])

  const filtered = useMemo(() => {
    // 自分の子は先頭固定表示するため除外（退会済みは別セクションで表示）
    return activeMembers.filter(m => {
      if (myMemberIds.has(m.id)) return false
      if (keyword.trim()) {
        const kw = keyword.trim().toLowerCase()
        const matchName = m.full_name.toLowerCase().includes(kw)
        const matchKana = m.full_name_kana?.toLowerCase().includes(kw) ?? false
        if (!matchName && !matchKana) return false
      }
      if (gradeFilter && getGradeCategory(m.birth_date) !== gradeFilter) return false
      if (genderFilter && m.gender !== genderFilter) return false
      if (visibilityFilter === 'visible' && !m.is_visible) return false
      if (visibilityFilter === 'hidden' && m.is_visible) return false
      if (practiceDaysFilter.length > 0) {
        const days = m.practice_days ?? []
        if (!practiceDaysFilter.some(d => days.includes(d))) return false
      }
      return true
    })
  }, [activeMembers, myMemberIds, keyword, gradeFilter, genderFilter, visibilityFilter, practiceDaysFilter])

  const hasFilter = keyword || gradeFilter || genderFilter || visibilityFilter || practiceDaysFilter.length > 0

  function resetFilters() {
    setKeyword('')
    setGradeFilter('')
    setGenderFilter('')
    setVisibilityFilter('')
    setPracticeDaysFilter([])
  }

  return (
    <div>
      {/* フィルタエリア */}
      <div className="bg-white rounded-xl border border-[#EAE0A8] mb-4">
        {/* モバイル: 折り畳みトグル */}
        <button
          type="button"
          onClick={() => setIsFilterOpen(v => !v)}
          className="sm:hidden w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-[#1A3666]"
        >
          <span className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M6 8h12M9 12h6" />
            </svg>
            フィルタ
            {hasFilter && <span className="w-2 h-2 rounded-full bg-[#F5C800] inline-block" />}
          </span>
          <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div className={`space-y-3 p-4 sm:block ${isFilterOpen ? 'block' : 'hidden'} sm:border-t-0 border-t border-[#EAE0A8] sm:border-transparent`}>
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
            placeholder="名前で検索"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent"
          />
          {keyword && (
            <button type="button" onClick={() => setKeyword('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              ×
            </button>
          )}
        </div>

        {/* 学年カテゴリ */}
        <FilterPills label="学年" options={GRADE_FILTERS} value={gradeFilter} onChange={setGradeFilter} />

        {/* 性別 */}
        <FilterPills label="性別" options={GENDER_FILTERS} value={genderFilter} onChange={setGenderFilter} />

        {/* 参加予定曜日（OR条件・複数選択可） */}
        <MultiFilterPills
          label="参加予定曜日"
          options={[...WEEKDAYS]}
          values={practiceDaysFilter}
          onChange={setPracticeDaysFilter}
        />

        {/* 表示状態（管理者のみ） */}
        {isAdmin && (
          <FilterPills label="表示状態" options={VISIBILITY_FILTERS} value={visibilityFilter} onChange={setVisibilityFilter} />
        )}
        </div>
      </div>

      {/* 件数 */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {hasFilter ? (
            <>
              {filtered.length} 名表示
              <button type="button" onClick={resetFilters} className="ml-2 text-[#1A3666] underline hover:no-underline text-xs">
                フィルタをリセット
              </button>
            </>
          ) : (
            <>{totalCount} 名登録</>
          )}
        </p>
      </div>

      {/* 保護者: 自分の子を先頭にネイビー太枠で表示 */}
      {myMembers.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {myMembers.map(member => (
            <div
              key={member.id}
              className="relative bg-white rounded-xl border-2 border-[#1A3666] p-5 flex items-center gap-4 hover:shadow-md transition-all"
            >
              <TappablePhoto
                src={member.photo_url}
                alt={member.full_name}
                containerClassName="w-12 h-16 rounded-xl bg-[#F5C800]/20 border-2 border-[#F5C800] flex items-center justify-center shrink-0 overflow-hidden"
              />
              <Link href={`/members/${member.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-[#1A3666] truncate">{member.full_name}</p>
                    {isNewMember(member.join_date) && (
                      <span className="text-[10px] font-bold bg-green-100 text-green-700 border border-green-300 px-1.5 py-0.5 rounded-full shrink-0">NEW</span>
                    )}
                  </div>
                  {member.full_name_kana && (
                    <p className="text-[11px] text-gray-400">{member.full_name_kana}</p>
                  )}
                  <p className="text-sm text-gray-900 mt-0.5">{calculateGrade(member.birth_date)}</p>
                  <p className="text-xs text-gray-900 mt-0.5">加入: {formatYearMonth(member.join_date)}</p>
                  {member.practice_days && member.practice_days.length > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">参加予定曜日: {member.practice_days.join('・')}</p>
                  )}
                </div>
              </Link>
              {member.approval_status === 'pending' && (
                <span className="absolute top-2 right-2 text-[10px] font-bold bg-orange-100 text-orange-600 border border-orange-300 px-1.5 py-0.5 rounded-full">
                  承認待ち
                </span>
              )}
              {member.approval_status === 'rejected' && (
                <span className="absolute top-2 right-2 text-[10px] font-bold bg-red-100 text-red-600 border border-red-300 px-1.5 py-0.5 rounded-full">
                  取下げ
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* メンバーカード一覧 */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(member => (
            <div
              key={member.id}
              className={`relative bg-white rounded-xl border p-5 flex items-center gap-4 transition-all ${
                member.is_visible
                  ? 'border-[#EAE0A8] hover:shadow-md hover:border-[#F5C800]'
                  : 'border-gray-200 opacity-50'
              }`}
            >
              <TappablePhoto
                src={member.photo_url}
                alt={member.full_name}
                containerClassName="w-12 h-16 rounded-xl bg-[#F5C800]/20 border-2 border-[#F5C800] flex items-center justify-center shrink-0 overflow-hidden"
              />
              <Link href={`/members/${member.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-[#1A3666] truncate">{member.full_name}</p>
                    {isNewMember(member.join_date) && (
                      <span className="text-[10px] font-bold bg-green-100 text-green-700 border border-green-300 px-1.5 py-0.5 rounded-full shrink-0">NEW</span>
                    )}
                  </div>
                  {member.full_name_kana && (
                    <p className="text-[11px] text-gray-400">{member.full_name_kana}</p>
                  )}
                  <p className="text-sm text-gray-900 mt-0.5">{calculateGrade(member.birth_date)}</p>
                  <p className="text-xs text-gray-900 mt-0.5">加入: {formatYearMonth(member.join_date)}</p>
                  {member.practice_days && member.practice_days.length > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">参加予定曜日: {member.practice_days.join('・')}</p>
                  )}
                  {isAdminOrCoach && (
                    <p className="text-xs text-gray-900 mt-0.5 font-mono">
                      登録番号: {member.registration_number ?? '登録なし'}
                    </p>
                  )}
                </div>
              </Link>
              {isAdmin && (
                <div className="shrink-0">
                  <VisibilityToggle id={member.id} isVisible={member.is_visible} />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#EAE0A8] py-16 text-center">
          <p className="text-gray-400 text-sm">
            {hasFilter ? '条件に一致するメンバーがいません' : 'メンバーがまだ登録されていません'}
          </p>
        </div>
      )}

      {/* 退会済みメンバー（退会後2か月間表示） */}
      {withdrawnMembers.length > 0 && (
        <div className="mt-8">
          <p className="text-xs font-semibold text-gray-400 mb-3">退会済み（退会後2か月間表示）</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {withdrawnMembers.map(member => (
              <div
                key={member.id}
                className="relative bg-gray-50 rounded-xl border border-gray-200 p-5 flex items-center gap-4"
              >
                <TappablePhoto
                  src={member.photo_url}
                  alt={member.full_name}
                  containerClassName="w-12 h-16 rounded-xl bg-gray-100 border-2 border-gray-200 flex items-center justify-center shrink-0 overflow-hidden"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-gray-400 truncate">{member.full_name}</p>
                  {member.full_name_kana && (
                    <p className="text-[11px] text-gray-400">{member.full_name_kana}</p>
                  )}
                  <p className="text-sm text-gray-400 mt-0.5">{calculateGrade(member.birth_date)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">加入: {formatYearMonth(member.join_date)}</p>
                  <span className="inline-block mt-1 text-[10px] font-bold bg-red-50 text-red-500 border border-red-200 px-1.5 py-0.5 rounded-full">
                    {formatWithdrawalLabel(member.withdrawn_at!)}
                  </span>
                </div>
                {(isAdmin || myMemberIds.has(member.id)) && (
                  <RejoinButton
                    memberId={member.id}
                    memberName={member.full_name}
                    isAdmin={isAdmin}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
