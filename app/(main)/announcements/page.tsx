import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils/grade'
import type { Role, Announcement } from '@/lib/types'
import DeleteButton from './_components/DeleteButton'

function getPublishStatus(a: Announcement, today: string): 'active' | 'before' | 'ended' {
  if (a.publish_start && today < a.publish_start) return 'before'
  if (a.publish_end && today > a.publish_end) return 'ended'
  return 'active'
}

function canView(a: Announcement, role: Role): boolean {
  if (role === 'admin') return true
  if (a.target === 'all') return true
  if (a.target === 'coach' && role === 'coach') return true
  if (a.target === 'member' && role === 'member') return true
  return false
}

const TARGET_LABEL: Record<string, { label: string; className: string }> = {
  coach:  { label: '指導者のみ', className: 'bg-[#1A3666] text-white' },
  member: { label: '保護者のみ', className: 'bg-[#F5C800] text-[#1A3666]' },
}


export default async function AnnouncementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: announcements }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user!.id).single(),
    supabase.from('announcements').select('*').order('created_at', { ascending: false }),
  ])

  const role = (profile?.role ?? 'member') as Role
  const isAdmin = role === 'admin'
  const today = new Date().toISOString().split('T')[0]

  const visibleAnnouncements = (announcements ?? []).filter((a: Announcement) => {
    if (!canView(a, role)) return false
    if (isAdmin) return true
    return getPublishStatus(a, today) === 'active'
  })

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[#1A3666]">連絡事項</h1>
        {isAdmin && (
          <Link
            href="/announcements/new"
            className="text-sm font-semibold bg-[#1A3666] text-white px-4 py-2 rounded-lg hover:bg-[#2A52A0] transition-colors"
          >
            ＋ 新規作成
          </Link>
        )}
      </div>

      {visibleAnnouncements.length > 0 ? (
        <div className="space-y-3">
          {visibleAnnouncements.map((a: Announcement) => {
            const status = getPublishStatus(a, today)
            const targetInfo = TARGET_LABEL[a.target]
            return (
              <div key={a.id} className="relative">
                <div
                  className={`rounded-xl p-[2px] hover:shadow-sm transition-all ${
                    a.target === 'coach'  ? 'bg-[#1A3666]' :
                    a.target === 'member' ? 'bg-[#F5C800]' :
                    'bg-[#F97316]'
                  }`}
                >
                  <div className="bg-white rounded-[10px]">
                    <Link href={`/announcements/${a.id}`} className={`block p-5 ${isAdmin ? 'pr-20' : ''}`}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-[#1A3666]">{a.title}</p>
                        {targetInfo && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${targetInfo.className}`}>
                            {targetInfo.label}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{formatDate(a.created_at.split('T')[0])}</p>
                      {isAdmin && (a.publish_start || a.publish_end) && (
                        <p className="text-xs text-gray-400 mt-1">
                          公開期間: {a.publish_start ? formatDate(a.publish_start) : '開始日なし'} 〜 {a.publish_end ? formatDate(a.publish_end) : '終了日なし'}
                        </p>
                      )}
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2 leading-relaxed">{a.content}</p>
                    </Link>
                  </div>
                </div>

                {isAdmin && (
                  <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                    {status === 'before' && (
                      <span className="text-xs font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">公開前</span>
                    )}
                    {status === 'ended' && (
                      <span className="text-xs font-semibold bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">公開終了</span>
                    )}
                    <DeleteButton id={a.id} title={a.title} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#EAE0A8] py-16 text-center">
          <p className="text-gray-400 text-sm">連絡事項はまだありません</p>
        </div>
      )}
    </div>
  )
}
