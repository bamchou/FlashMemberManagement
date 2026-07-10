'use client'

import { logout } from '@/app/login/actions'

export default function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="text-sm text-white/70 hover:text-white transition-colors px-3 py-1.5 rounded hover:bg-white/10"
      >
        ログアウト
      </button>
    </form>
  )
}
