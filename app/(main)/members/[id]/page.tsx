import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateGrade, formatDate, formatYearMonth, calculateExperience } from '@/lib/utils/grade'
import type { Role, TournamentResult, PrefecturalReinforcement } from '@/lib/types'
import MemberEventSection from './_components/MemberEventSection'
import TappablePhoto from '../_components/TappablePhoto'
import DeleteMemberButton from './_components/DeleteMemberButton'
import ApprovalButtons from '../_components/ApprovalButtons'

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const adminSupabase = createAdminClient()

  const [{ data: profile }, { data: member }, { data: results }, { data: reinforcements }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user!.id).single(),
    adminSupabase.from('members').select('*').eq('id', id).single(),
    adminSupabase.from('tournament_results').select('*').eq('member_id', id).order('tournament_date', { ascending: false }),
    adminSupabase.from('prefectural_reinforcements').select('*').eq('member_id', id).order('selected_date', { ascending: false }),
  ])

  if (!member) notFound()

  const role = profile?.role as Role
  const isAdmin = role === 'admin'
  const isAdminOrCoach = role === 'admin' || role === 'coach'
  const isGuardian = role === 'member'
  const isMyMember = member.guardian_id === user!.id
  const isPending = member.approval_status === 'pending'
  const oneMonthAgo = new Date()
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
  const isNew = new Date(member.join_date) >= oneMonthAgo

  // 承認待ちメンバーは管理者と担当保護者のみ閲覧可
  if (isPending && !isAdmin && !isMyMember) notFound()

  // 保護者が自分の子を見ている場合のみ参加登録セクションを表示
  const showEventSection = isGuardian && isMyMember

  // 今後の予定を取得（保護者のみ）
  let upcomingEvents: { id: string; title: string; event_type: string; start_at: string; end_at: string; status: string }[] = []
  let participationStatusMap = new Map<string, 'approved' | 'pending'>()

  if (showEventSection) {
    const now = new Date().toISOString()
    const { data: eventsData } = await adminSupabase
      .from('events')
      .select('id, title, event_type, start_at, end_at, status, target')
      .gte('start_at', now)
      .in('target', ['all', 'member'])
      .eq('is_visible', true)
      .order('start_at', { ascending: true })
      .limit(200)
    upcomingEvents = eventsData ?? []

    const { data: participations } = await adminSupabase
      .from('event_participants')
      .select('event_id, approval_status')
      .eq('member_id', id)
    participationStatusMap = new Map(
      (participations ?? []).map((p: { event_id: string; approval_status: string }) => [
        p.event_id, p.approval_status as 'approved' | 'pending'
      ])
    )
  }

  return (
    <div className="max-w-2xl">
      {/* 戻るリンク */}
      <Link href="/members" className="text-sm text-[#1A3666] hover:underline mb-4 inline-block">
        ← メンバー一覧に戻る
      </Link>

      {/* メンバー基本情報 */}
      <div className="bg-white rounded-xl border border-[#EAE0A8] p-6 mb-4">
        {isPending && (
          <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg px-4 py-2.5 flex items-center gap-2">
            <span className="text-xs font-bold bg-orange-100 text-orange-600 border border-orange-300 px-2 py-0.5 rounded-full">承認待ち</span>
            <p className="text-sm text-orange-700">このメンバーはまだ承認されていません</p>
          </div>
        )}

        <div className="flex items-center gap-5 mb-5">
          <TappablePhoto
            src={member.photo_url}
            alt={member.full_name}
            containerClassName="w-16 h-24 rounded-xl bg-[#F5C800]/20 border-2 border-[#F5C800] flex items-center justify-center shrink-0 overflow-hidden"
            fallbackSize="text-4xl"
          />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-[#1A3666]">{member.full_name}</h1>
              {isNew && (
                <span className="text-xs font-bold bg-green-100 text-green-700 border border-green-300 px-2 py-0.5 rounded-full">NEW</span>
              )}
            </div>
            {member.full_name_kana && (
              <p className="text-sm text-gray-400 mt-0.5">{member.full_name_kana}</p>
            )}
            <p className="text-gray-500 mt-1">{calculateGrade(member.birth_date)}</p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-0.5">性別</dt>
            <dd className="text-[#1A3666] font-medium">{member.gender ?? '未設定'}</dd>
          </div>
          <div>
            <dt className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-0.5">生年月日</dt>
            <dd className="text-[#1A3666] font-medium">{formatDate(member.birth_date)}</dd>
          </div>
          <div>
            <dt className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-0.5">加入年月</dt>
            <dd className="text-[#1A3666] font-medium">{formatYearMonth(member.join_date)}</dd>
          </div>
          <div>
            <dt className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-0.5">バドミントン歴</dt>
            <dd className="text-[#1A3666] font-medium">
              {member.badminton_start_date
                ? `${calculateExperience(member.badminton_start_date)}（${formatYearMonth(member.badminton_start_date)}〜）`
                : '未設定'}
            </dd>
          </div>
          {isAdminOrCoach && member.registration_number && (
            <div>
              <dt className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-0.5">協会登録番号</dt>
              <dd className="text-[#1A3666] font-medium font-mono">{member.registration_number}</dd>
            </div>
          )}
          {member.practice_frequency && (
            <div>
              <dt className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-0.5">練習頻度</dt>
              <dd className="text-[#1A3666] font-medium">週{member.practice_frequency}回</dd>
            </div>
          )}
          {member.practice_days && member.practice_days.length > 0 && (
            <div>
              <dt className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-0.5">参加曜日</dt>
              <dd className="text-[#1A3666] font-medium">{member.practice_days.join('・')}</dd>
            </div>
          )}
        </dl>

        {member.play_style && (
          <div className="mt-4 pt-4 border-t border-[#EAE0A8]">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-1.5">プレイスタイル・強み</p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{member.play_style}</p>
          </div>
        )}

        {isAdmin && isPending && (
          <div className="mt-5 pt-5 border-t border-[#EAE0A8]">
            <p className="text-sm font-semibold text-[#1A3666] mb-2">承認・却下</p>
            <ApprovalButtons id={id} />
          </div>
        )}

        {(isAdmin || (isGuardian && isMyMember)) && !isPending && (
          <div className="mt-5 pt-5 border-t border-[#EAE0A8] flex gap-3 flex-wrap">
            <Link
              href={`/members/${id}/edit`}
              className="text-sm font-semibold text-[#1A3666] border border-[#1A3666] px-4 py-2 rounded-lg hover:bg-[#1A3666] hover:text-white transition-colors"
            >
              メンバー情報を編集
            </Link>
            {isAdmin && <DeleteMemberButton id={id} name={member.full_name} />}
          </div>
        )}
      </div>

      {!isPending && (
        <>
          {/* 戦績 */}
          <div className="bg-white rounded-xl border border-[#EAE0A8] p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[#1A3666]">戦績</h2>
              {isAdmin && (
                <Link
                  href={`/members/${id}/results/new`}
                  className="text-sm font-semibold bg-[#1A3666] text-white px-3 py-1.5 rounded-lg hover:bg-[#2A52A0] transition-colors"
                >
                  ＋ 追加
                </Link>
              )}
            </div>

            {results && results.length > 0 ? (
              <div className="space-y-3">
                {results.map((r: TournamentResult) => (
                  <div key={r.id} className="border border-[#EAE0A8] rounded-lg p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-[#1A3666]">{r.tournament_name}</p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {formatDate(r.tournament_date)}　{r.event_type}
                        </p>
                        {r.result && (
                          <p className="text-sm font-medium text-gray-700 mt-1">成績: {r.result}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        {r.advanced_to_kyushu && (
                          <span className="text-xs font-bold bg-[#1A3666] text-white px-2 py-0.5 rounded-full">九州大会</span>
                        )}
                        {r.advanced_to_prefectural && !r.advanced_to_kyushu && (
                          <span className="text-xs font-bold bg-[#2A52A0] text-white px-2 py-0.5 rounded-full">県大会</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center">
                <p className="text-gray-400 text-sm">戦績がまだ登録されていません</p>
              </div>
            )}
          </div>

          {/* 参加予定・参加登録（保護者が自分の子を見るときのみ） */}
          {showEventSection && (
            <div className="bg-white rounded-xl border border-[#EAE0A8] p-6 mb-4">
              <h2 className="text-base font-bold text-[#1A3666] mb-4">今後の予定・参加登録</h2>
              <MemberEventSection
                memberId={id}
                events={upcomingEvents}
                participationStatusMap={participationStatusMap}
              />
            </div>
          )}

          {/* 県強化選手選出 */}
          <div className="bg-white rounded-xl border border-[#EAE0A8] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[#1A3666]">県強化選手選出</h2>
              {isAdmin && (
                <Link
                  href={`/members/${id}/reinforcements/new`}
                  className="text-sm font-semibold bg-[#F5C800] text-[#1A3666] px-3 py-1.5 rounded-lg hover:bg-[#E5B800] transition-colors"
                >
                  ＋ 追加
                </Link>
              )}
            </div>

            {reinforcements && reinforcements.length > 0 ? (
              <div className="space-y-3">
                {reinforcements.map((r: PrefecturalReinforcement) => (
                  <div key={r.id} className="border border-[#EAE0A8] rounded-lg p-4 bg-[#FFFDF0]">
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-bold bg-[#F5C800] text-[#1A3666] px-2 py-0.5 rounded-full shrink-0 mt-0.5">
                        県強化選手
                      </span>
                      <div>
                        <p className="font-semibold text-[#1A3666]">{formatDate(r.selected_date)}</p>
                        {r.notes && (
                          <p className="text-sm text-gray-600 mt-0.5">{r.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center">
                <p className="text-gray-400 text-sm">県強化選手選出の記録がありません</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
