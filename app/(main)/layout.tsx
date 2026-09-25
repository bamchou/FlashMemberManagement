import { ViewTransition, Suspense } from 'react'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Nav, { MobileNavBar } from './_components/Nav'
import LogoutButton from './_components/LogoutButton'
import NotificationButton from './_components/NotificationButton'
import PullToRefresh from './_components/PullToRefresh'
import SessionGuard from './_components/SessionGuard'
import ServiceWorkerRegistrar from './_components/ServiceWorkerRegistrar'
import InstallBanner from './_components/InstallBanner'
import NavigationProgress from './_components/NavigationProgress'
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

  // 未確認（未読）お知らせ件数を算出（ナビのバッジ用）
  const role = profile.role as Role
  const todayJST = new Date(new Date().getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const [{ data: annRows }, { data: readRows }] = await Promise.all([
    supabase.from('announcements').select('id, target, publish_start, publish_end, created_by'),
    supabase.from('announcement_reads').select('announcement_id').eq('user_id', user.id),
  ])
  const readSet = new Set((readRows ?? []).map((r: { announcement_id: string }) => r.announcement_id))
  const unreadAnnouncements = (annRows ?? []).filter((a: {
    id: string; target: string; publish_start: string | null; publish_end: string | null; created_by: string | null
  }) => {
    // 閲覧対象
    const canView = role === 'admin' || a.target === 'all'
      || (a.target === 'coach' && role === 'coach')
      || (a.target === 'member' && role === 'member')
    if (!canView) return false
    // 公開期間（現在公開中のみ）
    if (a.publish_start && todayJST < a.publish_start.slice(0, 10)) return false
    if (a.publish_end && todayJST > a.publish_end.slice(0, 10)) return false
    // 自分が作成したものは対象外／既読は対象外
    if (a.created_by === user.id) return false
    return !readSet.has(a.id)
  }).length

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF0]">
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      {/* ヘッダー */}
      <header className="bg-[#1A3666] shadow-md" style={{ viewTransitionName: 'site-header' }}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          {/* ロゴ */}
          <div className="flex items-center gap-2 mr-4 shrink-0">
            <span className="text-xl">🏸</span>
            <span className="text-[#F5C800] font-bold text-sm leading-tight">
              BC FLASH
              <span className="text-white/80 font-normal text-xs hidden sm:block">メンバー管理</span>
            </span>
          </div>

          {/* ナビゲーション */}
          <Nav role={role} unreadAnnouncements={unreadAnnouncements} />

          {/* ユーザー情報 */}
          <div className="ml-auto flex items-center gap-3 shrink-0">
            <Link href="/profile" className="text-right hidden sm:block hover:opacity-80" title="マイプロフィール">
              <p className="text-white text-sm font-semibold leading-none">
                {profile.username}
              </p>
              <p className="text-white/50 text-xs mt-0.5">
                {roleLabel[profile.role as Role]}
              </p>
            </Link>
            <NotificationButton />
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* モバイルボトムナビ: header の外で描画して stacking context を分離 */}
      <MobileNavBar role={role} unreadAnnouncements={unreadAnnouncements} />

      <PullToRefresh />
      <SessionGuard />
      <ServiceWorkerRegistrar />
      <InstallBanner />

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 pb-28 sm:pb-8">
        <ViewTransition>
          {children}
        </ViewTransition>
      </main>
    </div>
  )
}
