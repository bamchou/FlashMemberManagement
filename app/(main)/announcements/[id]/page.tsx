import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils/grade'
import type { Role } from '@/lib/types'

const TARGET_LABEL: Record<string, { label: string; className: string }> = {
  coach:  { label: '指導者のみ', className: 'bg-[#1A3666] text-white' },
  member: { label: '保護者のみ', className: 'bg-[#F5C800] text-[#1A3666]' },
}

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: announcement }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user!.id).single(),
    supabase.from('announcements').select('*').eq('id', id).single(),
  ])

  if (!announcement) notFound()

  const role = (profile?.role ?? 'member') as Role
  const isAdmin = role === 'admin'
  const today = new Date().toISOString().split('T')[0]

  // 閲覧権限チェック
  const targetAllowed =
    isAdmin ||
    announcement.target === 'all' ||
    (announcement.target === 'coach' && role === 'coach') ||
    (announcement.target === 'member' && role === 'member')

  const beforeStart = announcement.publish_start && today < announcement.publish_start
  const afterEnd = announcement.publish_end && today > announcement.publish_end
  const outOfRange = !isAdmin && (beforeStart || afterEnd)

  if (!targetAllowed || outOfRange) {
    return (
      <div className="max-w-2xl">
        <Link href="/announcements" className="text-sm text-[#1A3666] hover:underline mb-4 inline-block">
          ← 連絡事項一覧に戻る
        </Link>
        <div className="bg-white rounded-xl border border-[#EAE0A8] py-16 text-center">
          <p className="text-gray-400 text-sm">この連絡事項は閲覧できません</p>
        </div>
      </div>
    )
  }

  const targetInfo = TARGET_LABEL[announcement.target]

  return (
    <div className="max-w-2xl">
      <Link href="/announcements" className="text-sm text-[#1A3666] hover:underline mb-4 inline-block">
        ← 連絡事項一覧に戻る
      </Link>

      <div className="bg-white rounded-xl border border-[#EAE0A8] p-6">
        <div className="mb-5">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-[#1A3666]">{announcement.title}</h1>
            {targetInfo && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${targetInfo.className}`}>
                {targetInfo.label}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 mt-1">{formatDate(announcement.created_at.split('T')[0])}</p>
          {isAdmin && (announcement.publish_start || announcement.publish_end) && (
            <p className="text-xs text-gray-400 mt-1">
              公開期間: {announcement.publish_start ? formatDate(announcement.publish_start) : '開始日なし'} 〜 {announcement.publish_end ? formatDate(announcement.publish_end) : '終了日なし'}
            </p>
          )}
        </div>

        <div className="pt-5 border-t border-[#EAE0A8]">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{announcement.content}</p>
        </div>

        {isAdmin && (
          <div className="mt-6 pt-5 border-t border-[#EAE0A8]">
            <Link
              href={`/announcements/${id}/edit`}
              className="text-sm font-semibold text-[#1A3666] border border-[#1A3666] px-4 py-2 rounded-lg hover:bg-[#1A3666] hover:text-white transition-colors"
            >
              編集
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
