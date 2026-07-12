import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateGrade, formatDate, calculateExperience } from '@/lib/utils/grade'
import type { Role, TournamentResult, PrefecturalReinforcement } from '@/lib/types'
import MemberEventSection from './_components/MemberEventSection'
import DeleteMemberButton from './_components/DeleteMemberButton'

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: member }, { data: results }, { data: reinforcements }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user!.id).single(),
    supabase.from('members').select('*').eq('id', id).single(),
    supabase.from('tournament_results').select('*').eq('member_id', id).order('tournament_date', { ascending: false }),
    supabase.from('prefectural_reinforcements').select('*').eq('member_id', id).order('selected_date', { ascending: false }),
  ])

  if (!member) notFound()

  const role = profile?.role as Role
  const isAdmin = role === 'admin'
  const isAdminOrCoach = role === 'admin' || role === 'coach'
  const isGuardian = role === 'member'
  const isMyMember = member.guardian_id === user!.id

  // 保護者が自分の子を見ている場合のみ参加登録セクションを表示
  const showEventSection = isGuardian && isMyMember

  // 今後の予定を取得（保護者のみ）
  const adminSupabase = createAdminClient()
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
      .limit(20)
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
        <div className="flex items-center gap-5 mb-5">
          <div className="w-20 h-20 rounded-full bg-[#F5C800]/20 border-2 border-[#F5C800] flex items-center justify-center shrink-0 overflow-hidden">
            {member.photo_url ? (
              <img src={member.photo_url} alt={member.full_name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl">👤</span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1A3666]">{member.full_name}</h1>
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
            <dt className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-0.5">加入年月日</dt>
            <dd className="text-[#1A3666] font-medium">{formatDate(member.join_date)}</dd>
          </div>
          <div>
            <dt className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-0.5">バドミントン歴</dt>
            <dd className="text-[#1A3666] font-medium">
              {member.badminton_start_date
                ? `${calculateExperience(member.badminton_start_date)}（${formatDate(member.badminton_start_date)}〜）`
                : '未設定'}
            </dd>
          </div>
          {isAdminOrCoach && member.registration_number && (
            <div>
              <dt className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-0.5">協会登録番号</dt>
              <dd className="text-[#1A3666] font-medium font-mono">{member.registration_number}</dd>
            </div>
          )}
        </dl>

        {member.play_style && (
          <div className="mt-4 pt-4 border-t border-[#EAE0A8]">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-1.5">プレイスタイル・強み</p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{member.play_style}</p>
          </div>
        )}

        {isAdmin && (
          <div className="mt-5 pt-5 border-t border-[#EAE0A8] flex gap-3 flex-wrap">
            <Link
              href={`/members/${id}/edit`}
              className="text-sm font-semibold text-[#1A3666] border border-[#1A3666] px-4 py-2 rounded-lg hover:bg-[#1A3666] hover:text-white transition-colors"
            >
              メンバー情報を編集
            </Link>
            <DeleteMemberButton id={id} name={member.full_name} />
          </div>
        )}
      </div>

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
    </div>
  )
}
