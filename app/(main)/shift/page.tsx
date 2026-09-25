import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/lib/types'

type MenuItem = {
  href: string
  label: string
  description: string
  roles: Role[]
  icon: React.ReactNode
}

const MENU_ITEMS: MenuItem[] = [
  {
    href: '/shift/coach',
    label: 'コーチ用シフト',
    description: '練習ごとのコーチの参加可否・参加要請を管理します',
    roles: ['admin', 'coach'],
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: '/shift/gym-candidates',
    label: '体育館予約候補',
    description: '曜日ごとの第1〜第4候補（体育館・面数・予約時間）を管理します',
    roles: ['admin'],
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    href: '/shift/gym-assignments',
    label: '体育館予約割当',
    description: '練習日ごとに体育館の予約担当者を割り当てます',
    roles: ['admin'],
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
]

export default async function ShiftMenuPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  const role = (profile?.role ?? 'member') as Role
  if (role !== 'admin' && role !== 'coach') redirect('/members')

  const items = MENU_ITEMS.filter(item => item.roles.includes(role))

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-[#1A3666] mb-6">シフト</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white rounded-xl border border-[#EAE0A8] p-5 flex items-center gap-4 hover:shadow-md hover:border-[#F5C800] transition-all group"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors bg-[#F5C800]/20 text-[#1A3666] group-hover:bg-[#F5C800]/40">
              {item.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-[#1A3666]">{item.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  )
}
