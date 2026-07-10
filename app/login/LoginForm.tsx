'use client'

import { useActionState, useState } from 'react'
import { login, type LoginState } from './actions'

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, undefined)
  const [username, setUsername] = useState('')

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="username" className="block text-sm font-semibold text-[#1A3666] mb-1.5">
          ユーザーID
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent transition-shadow"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-semibold text-[#1A3666] mb-1.5">
          パスワード
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent transition-shadow"
        />
      </div>

      {state?.error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-[#1A3666] text-white font-bold py-3 rounded-lg text-sm hover:bg-[#2A52A0] transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
      >
        {pending ? 'ログイン中...' : 'ログイン'}
      </button>
    </form>
  )
}
