'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateUser, resetPassword } from '../../actions'

const ROLE_OPTIONS = [
  { value: 'admin',  label: '管理者' },
  { value: 'coach',  label: '指導者' },
  { value: 'member', label: '保護者' },
]

type Props = {
  userId: string
  initialUsername: string
  initialDisplayName: string
  initialDisplayNameKana: string | null
  initialRole: string
  initialPhotoUrl: string | null
  initialBirthDate: string
  initialBadmintonStartDate: string
  initialShowOnMembersPage: boolean
  initialQualifications: string | null
  initialTempPassword: string | null
  roleChangeLocked: boolean
}

export default function EditUserForm({
  userId,
  initialUsername,
  initialDisplayName,
  initialDisplayNameKana,
  initialRole,
  initialPhotoUrl,
  initialBirthDate,
  initialBadmintonStartDate,
  initialShowOnMembersPage,
  initialQualifications,
  initialTempPassword,
  roleChangeLocked,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isResetting, startReset] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [tempPassword, setTempPassword] = useState<string | null>(initialTempPassword)
  const [copied, setCopied] = useState(false)
  const [copiedBoth, setCopiedBoth] = useState(false)
  const [fields, setFields] = useState({
    username: initialUsername,
    display_name: initialDisplayName,
    role: initialRole,
    birth_date: initialBirthDate,
    badminton_start_date: initialBadmintonStartDate,
    show_on_members_page: initialShowOnMembersPage,
    qualifications: initialQualifications ?? '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    const val = type === 'checkbox' ? checked : (name === 'username' ? value.replace(/[^a-zA-Z0-9_]/g, '') : value)
    setFields(prev => ({ ...prev, [name]: val }))
    setError(null)
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setPreview(file ? URL.createObjectURL(file) : null)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateUser(userId, undefined, formData)
      if (result && 'error' in result) setError(result.error)
    })
  }

  function handleReset() {
    if (!confirm('パスワードを再発行しますか？現在のパスワードは使えなくなります。')) return
    startReset(async () => {
      const result = await resetPassword(userId)
      if ('password' in result) setTempPassword(result.password)
      else setError(result.error)
    })
  }

  function handleCopy() {
    if (!tempPassword) return
    navigator.clipboard.writeText(tempPassword).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleCopyBoth() {
    if (!tempPassword) return
    navigator.clipboard.writeText(`${fields.username} / ${tempPassword}`).then(() => {
      setCopiedBoth(true)
      setTimeout(() => setCopiedBoth(false), 2000)
    })
  }

  const photoSrc = preview ?? initialPhotoUrl
  const today = new Date().toISOString().split('T')[0]
  const thisMonth = today.slice(0, 7)

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 写真 */}
      <div>
        <p className="block text-sm font-semibold text-[#1A3666] mb-1.5">写真</p>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-[#F5C800]/20 border-2 border-[#F5C800] flex items-center justify-center overflow-hidden shrink-0">
            {photoSrc
              ? <img src={photoSrc} alt="プロフィール" className="w-full h-full object-cover" />
              : <span className="text-3xl">👤</span>
            }
          </div>
          <label className="cursor-pointer text-sm font-semibold text-[#1A3666] border border-[#1A3666] px-4 py-2 rounded-lg hover:bg-[#1A3666] hover:text-white transition-colors">
            {initialPhotoUrl ? '写真を変更' : 'ファイルを選択'}
            <input type="file" name="photo" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </label>
        </div>
      </div>

      {/* ユーザー名 */}
      <div>
        <label htmlFor="username" className="block text-sm font-semibold text-[#1A3666] mb-1.5">
          ユーザー名（ログインID）<span className="text-red-500 ml-1">*</span>
        </label>
        <input
          id="username" name="username" type="text" required
          value={fields.username} onChange={handleChange}
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white"
        />
        <p className="text-xs text-gray-400 mt-1">英数字とアンダースコアのみ使用可</p>
      </div>

      {/* 表示名 */}
      <div>
        <label htmlFor="display_name" className="block text-sm font-semibold text-[#1A3666] mb-1.5">表示名</label>
        <input
          id="display_name" name="display_name" type="text"
          value={fields.display_name} onChange={handleChange}
          placeholder="例: 山田 太郎"
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white"
        />
      </div>

      {/* 表示名（読み仮名） */}
      <div>
        <label htmlFor="display_name_kana" className="block text-sm font-semibold text-[#1A3666] mb-1.5">表示名（読み仮名）</label>
        <input
          id="display_name_kana" name="display_name_kana" type="text"
          defaultValue={initialDisplayNameKana ?? ''}
          placeholder="例: ヤマダ タロウ"
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white"
        />
      </div>

      {/* 役割 */}
      <div>
        <label htmlFor="role" className="block text-sm font-semibold text-[#1A3666] mb-1.5">
          役割<span className="text-red-500 ml-1">*</span>
        </label>
        <select
          id="role" name="role" required
          value={fields.role} onChange={handleChange}
          disabled={roleChangeLocked}
          className={`w-full px-3.5 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent ${
            roleChangeLocked ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white border-gray-300'
          }`}
        >
          {ROLE_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        {roleChangeLocked && (
          <>
            <input type="hidden" name="role" value={fields.role} />
            <p className="text-xs text-amber-600 mt-1">管理者が1名のため役割を変更できません</p>
          </>
        )}
      </div>

      {/* 資格・免許（管理者・指導者のみ） */}
      {(fields.role === 'admin' || fields.role === 'coach') && (
        <div>
          <label htmlFor="qualifications" className="block text-sm font-semibold text-[#1A3666] mb-1.5">
            資格・免許
          </label>
          <textarea
            id="qualifications" name="qualifications"
            value={fields.qualifications} onChange={handleChange}
            rows={3}
            placeholder="例: 審判資格B級、指導員資格"
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white resize-none"
          />
        </div>
      )}

      {/* 生年月日・バドミントン開始年月日 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="birth_date" className="block text-sm font-semibold text-[#1A3666] mb-1.5">生年月日</label>
          <input
            id="birth_date" name="birth_date" type="date"
            value={fields.birth_date} onChange={handleChange} max={today}
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white"
          />
        </div>
        <div>
          <label htmlFor="badminton_start_date" className="block text-sm font-semibold text-[#1A3666] mb-1.5">バドミントン開始年月</label>
          <input
            id="badminton_start_date" name="badminton_start_date" type="month"
            value={fields.badminton_start_date} onChange={handleChange} max={thisMonth}
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white"
          />
        </div>
      </div>

      {/* メンバー一覧表示 */}
      <div className="flex items-center gap-3 bg-[#FFFDF0] border border-[#EAE0A8] rounded-lg px-4 py-3">
        <input
          id="show_on_members_page" name="show_on_members_page" type="checkbox"
          checked={fields.show_on_members_page as boolean}
          onChange={handleChange}
          className="w-4 h-4 rounded border-gray-300 text-[#1A3666] focus:ring-[#1A3666] cursor-pointer"
        />
        <label htmlFor="show_on_members_page" className="text-sm font-semibold text-[#1A3666] cursor-pointer">
          メンバー一覧にコーチとして掲載する
        </label>
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => router.back()}
          className="flex-1 border border-gray-300 text-gray-600 font-semibold py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
          キャンセル
        </button>
        <button type="submit" disabled={isPending}
          className="flex-1 bg-[#1A3666] text-white font-bold py-2.5 rounded-lg text-sm hover:bg-[#2A52A0] transition-colors disabled:opacity-60">
          {isPending ? '更新中...' : '更新する'}
        </button>
      </div>

      {/* パスワード確認・再発行 */}
      <div className="pt-5 border-t border-[#EAE0A8] space-y-3">
        <p className="text-sm font-semibold text-[#1A3666]">パスワード</p>
        {tempPassword ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="flex-1 font-mono text-sm bg-[#FFFDF0] border border-[#EAE0A8] rounded-lg px-3 py-2.5 tracking-widest select-all">
                {tempPassword}
              </p>
              <button
                type="button"
                onClick={handleCopy}
                className={`shrink-0 text-sm font-semibold px-3 py-2.5 rounded-lg transition-colors ${
                  copied ? 'bg-green-100 text-green-700' : 'bg-[#1A3666] text-white hover:bg-[#2A52A0]'
                }`}
              >
                {copied ? 'コピー済' : 'コピー'}
              </button>
            </div>
            <button
              type="button"
              onClick={handleCopyBoth}
              className={`w-full text-sm font-semibold py-2.5 rounded-lg border transition-colors ${
                copiedBoth
                  ? 'bg-green-100 text-green-700 border-green-300'
                  : 'bg-white text-[#1A3666] border-[#1A3666] hover:bg-[#1A3666] hover:text-white'
              }`}
            >
              {copiedBoth
                ? `コピー済 （${fields.username} / ${tempPassword}）`
                : 'ログインID / パスワード をまとめてコピー'}
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-400">パスワードは確認できません</p>
        )}
        <button
          type="button"
          onClick={handleReset}
          disabled={isResetting}
          className="w-full text-sm text-amber-600 border border-amber-300 hover:bg-amber-50 font-semibold py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {isResetting ? '再発行中...' : 'パスワードを再発行する'}
        </button>
      </div>
    </form>
  )
}
