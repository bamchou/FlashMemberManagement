import { ViewTransition } from 'react'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import Nav, { MobileNavBar } from './_components/Nav'
import LogoutButton from './_components/LogoutButton'
import NotificationButton from './_components/NotificationButton'
import PullToRefresh from './_components/PullToRefresh'
import type { Role } from '@/lib/types'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, role, display_name, pending_reenrollment')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''
  if (profile.pending_reenrollment && profile.role === 'member' && pathname !== '/reenrollment') {
    redirect('/reenrollment')
  }

  const roleLabel: Record<Role, string> = {
    admin: '管理者',
    coach: '指導者',
    member: '一般',
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF0]">
      {/* ヘッダー */}
      <header className="relative overflow-hidden shadow-md" style={{ viewTransitionName: 'site-header' }}>
        {/* 背景写真 */}
        <img
          src="/team-photo.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* ネイビーオーバーレイ */}
        <div className="absolute inset-0 bg-[#1A3666]/75" />

        {/* ナビバー */}
        <div className="relative max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          {/* ロゴ */}
          <div className="flex items-center gap-2 mr-4 shrink-0">
            <span className="text-xl">🏸</span>
            <span className="text-[#F5C800] font-bold text-sm leading-tight">
              BC FLASH
              <span className="text-white/80 font-normal text-xs hidden sm:block">メンバー管理</span>
            </span>
          </div>

          {/* ナビゲーション */}
          <Nav role={profile.role as Role} />

          {/* ユーザー情報 */}
          <div className="ml-auto flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-white text-sm font-semibold leading-none">
                {profile.username}
              </p>
              <p className="text-white/50 text-xs mt-0.5">
                {roleLabel[profile.role as Role]}
              </p>
            </div>
            <NotificationButton />
            <LogoutButton />
          </div>
        </div>

        {/* 写真表示エリア */}
        <div className="relative h-20 sm:h-28" />
      </header>

      {/* モバイルボトムナビ: header の外で描画して stacking context を分離 */}
      <MobileNavBar role={profile.role as Role} />

      <PullToRefresh />

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 pb-28 sm:pb-8">
        <ViewTransition>
          {children}
        </ViewTransition>
      </main>
    </div>
  )
}
