import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Role, Announcement } from '@/lib/types'
import AnnouncementList from './_components/AnnouncementList'

function canView(a: Announcement, role: Role): boolean {
  if (role === 'admin') return true
  if (a.target === 'all') return true
  if (a.target === 'coach' && role === 'coach') return true
  if (a.target === 'member' && role === 'member') return true
  return false
}

function getPublishStatus(a: Announcement, today: string): 'active' | 'before' | 'ended' {
  if (a.publish_start && today < a.publish_start) return 'before'
  if (a.publish_end && today > a.publish_end) return 'ended'
  return 'active'
}

export default async function AnnouncementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: announcements }, { data: readRows }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user!.id).single(),
    supabase.from('announcements').select('*').order('created_at', { ascending: false }),
    supabase.from('announcement_reads').select('announcement_id').eq('user_id', user!.id),
  ])

  const readIds = (readRows ?? []).map((r: { announcement_id: string }) => r.announcement_id)
  const role = (profile?.role ?? 'member') as Role
  const isAdmin = role === 'admin'
  const today = new Date().toISOString().split('T')[0]

  const visibleAnnouncements = (announcements ?? []).filter((a: Announcement) => {
    if (!canView(a, role)) return false
    if (isAdmin) return true
    return getPublishStatus(a, today) === 'active'
  })

  // 登録者・最終更新者の名前
  const personIds = [...new Set(
    (visibleAnnouncements as Announcement[])
      .flatMap(a => [a.created_by, a.updated_by])
      .filter((id): id is string => !!id)
  )]
  const { data: people } = personIds.length > 0
    ? await supabase.from('profiles').select('id, display_name, username').in('id', personIds)
    : { data: [] }
  const nameMap: Record<string, string> = Object.fromEntries(
    (people ?? []).map((p: { id: string; display_name: string | null; username: string | null }) =>
      [p.id, p.display_name ?? p.username ?? '不明'])
  )

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[#1A3666]">お知らせ</h1>
        {isAdmin && (
          <Link
            href="/announcements/new"
            className="text-sm font-semibold bg-[#1A3666] text-white px-4 py-2 rounded-lg hover:bg-[#2A52A0] transition-colors"
          >
            ＋ 新規作成
          </Link>
        )}
      </div>

      <AnnouncementList
        announcements={visibleAnnouncements as Announcement[]}
        role={role}
        today={today}
        readIds={readIds}
        currentUserId={user!.id}
        nameMap={nameMap}
      />
    </div>
  )
}
