import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateAge, calculateExperience, calculateGrade, formatDate } from '@/lib/utils/grade'
import type { Role, Member, Profile } from '@/lib/types'
import MemberList from './_components/MemberList'

export default async function MembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: members }, { data: coaches }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user!.id).single(),
    supabase.from('members').select('*').order('birth_date', { ascending: true }).order('join_date', { ascending: true }),
    supabase.from('profiles')
      .select('id, display_name, username, role, photo_url, birth_date, badminton_start_date, qualifications')
      .eq('show_on_members_page', true)
      .in('role', ['admin', 'coach'])
      .order('created_at', { ascending: true }),
  ])

  const role = profile?.role as Role
  const isAdmin = role === 'admin'
  const isAdminOrCoach = role === 'admin' || role === 'coach'
  const isGuardian = role === 'member'

  // 管理者: 承認待ちメンバーを adminClient で取得
  let pendingMembers: Member[] = []
  if (isAdmin) {
    const adminSupabase = createAdminClient()
    const { data } = await adminSupabase
      .from('members')
      .select('*')
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: true })
    pendingMembers = (data ?? []) as Member[]
  }

  // 保護者: 自分の子のメンバー（承認済み・承認待ち両方）
  let myMembers: Member[] = []
  if (isGuardian) {
    myMembers = (members ?? []).filter((m: Member) => m.guardian_id === user!.id) as Member[]
  }

  const approvedVisibleMembers = (members ?? []).filter((m: Member) =>
    isAdmin || (m.is_visible && m.approval_status === 'approved')
  ) as Member[]

  return (
    <div>
      {/* コーチ一覧 */}
      {coaches && coaches.length > 0 && (
        <div className="mb-8">
          <h2 className="text-base font-bold text-[#1A3666] mb-3">コーチ</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {coaches.map((coach: Partial<Profile>) => (
              <div key={coach.id} className="bg-white rounded-xl border-2 border-[#1A3666] p-5 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#1A3666]/10 border-2 border-[#1A3666] flex items-center justify-center shrink-0 overflow-hidden">
                  {coach.photo_url
                    ? <img src={coach.photo_url} alt={coach.display_name ?? ''} className="w-full h-full object-cover" />
                    : <span className="text-2xl">👤</span>}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-[#1A3666] truncate">{coach.display_name ?? coach.username}</p>
                  {coach.birth_date && <p className="text-sm text-gray-900 mt-0.5">{calculateAge(coach.birth_date)}</p>}
                  {coach.badminton_start_date && (
                    <p className="text-xs text-gray-900 mt-0.5">バドミントン歴: {calculateExperience(coach.badminton_start_date)}</p>
                  )}
                  {coach.qualifications && (
                    <p className="text-xs text-gray-500 mt-0.5">{coach.qualifications}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 承認待ちセクション（管理者のみ） */}
      {isAdmin && pendingMembers.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-base font-bold text-[#1A3666]">承認待ちメンバー</h2>
            <span className="text-xs font-bold bg-orange-100 text-orange-600 border border-orange-300 px-2 py-0.5 rounded-full">
              {pendingMembers.length} 件
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingMembers.map((m: Member) => (
              <div key={m.id} className="bg-white rounded-xl border-2 border-orange-300 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#F5C800]/20 border-2 border-[#F5C800] flex items-center justify-center shrink-0 overflow-hidden">
                    {m.photo_url
                      ? <img src={m.photo_url} alt={m.full_name} className="w-full h-full object-cover" />
                      : <span className="text-xl">👤</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[#1A3666] truncate">{m.full_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{calculateGrade(m.birth_date)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">加入: {formatDate(m.join_date)}</p>
                  </div>
                  <Link
                    href={`/members/${m.id}`}
                    className="shrink-0 text-xs font-semibold text-[#1A3666] border border-[#1A3666] px-3 py-1.5 rounded-lg hover:bg-[#1A3666] hover:text-white transition-colors"
                  >
                    詳細
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* メンバー一覧ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-[#1A3666]">メンバー一覧</h1>
        {isGuardian && (
          <Link
            href="/members/new"
            className="bg-[#1A3666] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#2A52A0] transition-colors"
          >
            ＋ お子様の登録
          </Link>
        )}
      </div>

      <MemberList
        members={approvedVisibleMembers}
        myMembers={isGuardian ? myMembers : []}
        role={role}
        totalCount={approvedVisibleMembers.length}
      />
    </div>
  )
}
