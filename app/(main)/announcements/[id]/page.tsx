import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/utils/grade'
import type { Role, AnnouncementComment } from '@/lib/types'
import CommentSection from './_components/CommentSection'
import type { Attachment } from '@/lib/types'

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

  const [{ data: profile }, { data: announcement }, { data: rawComments }, { data: attachments }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user!.id).single(),
    supabase.from('announcements').select('*').eq('id', id).single(),
    supabase.from('announcement_comments')
      .select('*')
      .eq('announcement_id', id)
      .order('created_at', { ascending: true }),
    supabase.from('attachments').select('*').eq('entity_type', 'announcement').eq('entity_id', id).order('created_at', { ascending: true }),
  ])

  // adminクライアントでコメント投稿者のプロフィールを取得（RLS回避）
  const adminSupabase = createAdminClient()
  const userIds = [...new Set((rawComments ?? []).map((c: { user_id: string }) => c.user_id))]
  const { data: profilesData } = userIds.length > 0
    ? await adminSupabase.from('profiles').select('id, display_name, username').in('id', userIds)
    : { data: [] }
  const profileMap = Object.fromEntries((profilesData ?? []).map((p: { id: string; display_name: string | null; username: string | null }) => [p.id, p]))
  const comments = (rawComments ?? []).map((c: AnnouncementComment) => ({
    ...c,
    profiles: profileMap[c.user_id] ?? null,
  }))

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
    <div className="max-w-2xl space-y-4">
      <Link href="/announcements" className="text-sm text-[#1A3666] hover:underline inline-block">
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

        {attachments && attachments.length > 0 && (
          <div className="mt-5 pt-5 border-t border-[#EAE0A8]">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">添付ファイル</p>
            <div className="space-y-2">
              {(attachments as Attachment[]).map(att => (
                <a
                  key={att.id}
                  href={att.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-200 hover:border-[#1A3666] hover:bg-[#F5F8FF] transition-colors"
                >
                  {att.file_name.endsWith('.pdf') ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                  <span className="text-sm text-[#1A3666] truncate">{att.file_name}</span>
                </a>
              ))}
            </div>
          </div>
        )}

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

      <CommentSection
        announcementId={id}
        comments={(comments ?? []) as AnnouncementComment[]}
        currentUserId={user!.id}
        role={role}
      />
    </div>
  )
}
