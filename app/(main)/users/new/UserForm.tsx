'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createUser, type CreateUserState } from '../actions'

const ROLE_OPTIONS = [
  { value: 'admin',  label: '管理者' },
  { value: 'coach',  label: '指導者' },
  { value: 'member', label: '保護者' },
]

export default function UserForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [fields, setFields] = useState({ username: '', display_name: '', role: '', qualifications: '' })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const value = e.target.name === 'username'
      ? e.target.value.replace(/[^a-zA-Z0-9_]/g, '')
      : e.target.value
    setFields(prev => ({ ...prev, [e.target.name]: value }))
    setError(null)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        const result = await createUser(undefined, formData)
        if (result && 'error' in result) {
          setError(result.error)
        } else if (result && 'password' in result) {
          setGeneratedPassword(result.password)
        } else {
          setError('予期しないエラーが発生しました。もう一度お試しください。')
        }
      } catch (err) {
        console.error('[createUser]', err)
        setError('通信エラーが発生しました。もう一度お試しください。')
      }
    })
  }

  function handleCopy() {
    if (!generatedPassword) return
    navigator.clipboard.writeText(generatedPassword).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // 登録成功 → パスワード表示画面
  if (generatedPassword) {
    return (
      <div className="space-y-5">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-green-700 font-semibold text-sm">ユーザーを登録しました</p>
        </div>

        <div>
          <p className="text-sm font-semibold text-[#1A3666] mb-2">初期パスワード</p>
          <div className="flex items-center gap-2">
            <p className="flex-1 font-mono text-base bg-[#FFFDF0] border border-[#EAE0A8] rounded-lg px-4 py-3 tracking-widest select-all">
              {generatedPassword}
            </p>
            <button
              onClick={handleCopy}
              className={`shrink-0 text-sm font-semibold px-4 py-3 rounded-lg transition-colors ${
                copied
                  ? 'bg-green-100 text-green-700'
                  : 'bg-[#1A3666] text-white hover:bg-[#2A52A0]'
              }`}
            >
              {copied ? 'コピー済' : 'コピー'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">このパスワードをユーザーに伝えてください。この画面を閉じると確認できなくなります。</p>
        </div>

        <button
          onClick={() => router.push('/users')}
          className="w-full bg-[#1A3666] text-white font-bold py-2.5 rounded-lg text-sm hover:bg-[#2A52A0] transition-colors"
        >
          ユーザー一覧に戻る
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="username" className="block text-sm font-semibold text-[#1A3666] mb-1.5">
          ユーザー名（ログインID）<span className="text-red-500 ml-1">*</span>
        </label>
        <input
          id="username" name="username" type="text" required
          value={fields.username} onChange={handleChange}
          placeholder="例: yamada_taro"
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white"
        />
        <p className="text-xs text-gray-400 mt-1">英数字とアンダースコアのみ使用可</p>
      </div>

      <div>
        <label htmlFor="display_name" className="block text-sm font-semibold text-[#1A3666] mb-1.5">
          表示名
        </label>
        <input
          id="display_name" name="display_name" type="text"
          value={fields.display_name} onChange={handleChange}
          placeholder="例: 山田 太郎"
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white"
        />
      </div>

      <div>
        <label htmlFor="display_name_kana" className="block text-sm font-semibold text-[#1A3666] mb-1.5">
          表示名（カタカナ）
        </label>
        <input
          id="display_name_kana" name="display_name_kana" type="text"
          placeholder="例: ヤマダ タロウ"
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white"
        />
      </div>

      <div>
        <label htmlFor="role" className="block text-sm font-semibold text-[#1A3666] mb-1.5">
          役割<span className="text-red-500 ml-1">*</span>
        </label>
        <select
          id="role" name="role" required
          value={fields.role} onChange={handleChange}
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white"
        >
          <option value="">選択してください</option>
          {ROLE_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

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

      <div className="bg-[#FFFDF0] border border-[#EAE0A8] rounded-lg px-4 py-3 text-sm text-gray-600">
        パスワードは自動で設定されます。登録後に表示されますのでユーザーにお伝えください。
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
          {isPending ? '登録中...' : '登録する'}
        </button>
      </div>
    </form>
  )
}
