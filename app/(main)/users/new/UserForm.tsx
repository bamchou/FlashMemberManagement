'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createUser } from '../actions'

const ROLE_OPTIONS = [
  { value: 'admin',  label: '管理者' },
  { value: 'coach',  label: '指導者' },
  { value: 'member', label: '保護者' },
]

export default function UserForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState({
    username: '',
    display_name: '',
    role: '',
    password: '',
    password_confirm: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
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
      const result = await createUser(undefined, formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="username" className="block text-sm font-semibold text-[#1A3666] mb-1.5">
          ユーザー名（ログインID）<span className="text-red-500 ml-1">*</span>
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          value={fields.username}
          onChange={handleChange}
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
          id="display_name"
          name="display_name"
          type="text"
          value={fields.display_name}
          onChange={handleChange}
          placeholder="例: 山田 太郎"
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white"
        />
      </div>

      <div>
        <label htmlFor="role" className="block text-sm font-semibold text-[#1A3666] mb-1.5">
          役割<span className="text-red-500 ml-1">*</span>
        </label>
        <select
          id="role"
          name="role"
          required
          value={fields.role}
          onChange={handleChange}
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white"
        >
          <option value="">選択してください</option>
          {ROLE_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-semibold text-[#1A3666] mb-1.5">
          パスワード<span className="text-red-500 ml-1">*</span>
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          value={fields.password}
          onChange={handleChange}
          placeholder="6文字以上"
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white"
        />
      </div>

      <div>
        <label htmlFor="password_confirm" className="block text-sm font-semibold text-[#1A3666] mb-1.5">
          パスワード（確認）<span className="text-red-500 ml-1">*</span>
        </label>
        <input
          id="password_confirm"
          name="password_confirm"
          type="password"
          required
          value={fields.password_confirm}
          onChange={handleChange}
          placeholder="同じパスワードを入力"
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white"
        />
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
          {error}
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
          disabled={isPending}
          className="flex-1 bg-[#1A3666] text-white font-bold py-2.5 rounded-lg text-sm hover:bg-[#2A52A0] transition-colors disabled:opacity-60"
        >
          {isPending ? '登録中...' : '登録する'}
        </button>
      </div>
    </form>
  )
}
