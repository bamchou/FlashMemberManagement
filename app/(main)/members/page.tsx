import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { calculateGrade, formatDate, calculateAge, calculateExperience } from '@/lib/utils/grade'
import type { Role, Member, Profile } from '@/lib/types'
import VisibilityToggle from './_components/VisibilityToggle'

export default async function MembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: members }, { data: coaches }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user!.id).single(),
    supabase.from('members').select('*').order('join_date', { ascending: true }).order('full_name', { ascending: true }),
    supabase.from('profiles')
      .select('id, display_name, username, role, photo_url, birth_date, badminton_start_date')
      .eq('show_on_members_page', true)
      .in('role', ['admin', 'coach'])
      .order('created_at', { ascending: true }),
  ])

  const role = profile?.role as Role
  const isAdmin = role === 'admin'

  return (
    <div>
      {/* コーチ一覧 */}
      {coaches && coaches.length > 0 && (
        <div className="mb-8">
          <h2 className="text-base font-bold text-[#1A3666] mb-3">コーチ</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {coaches.map((coach: Partial<Profile>) => (
              <div
                key={coach.id}
                className="bg-white rounded-xl border-2 border-[#1A3666] p-5 flex items-center gap-4"
              >
                <div className="w-14 h-14 rounded-full bg-[#1A3666]/10 border-2 border-[#1A3666] flex items-center justify-center shrink-0 overflow-hidden">
                  {coach.photo_url
                    ? <img src={coach.photo_url} alt={coach.display_name ?? ''} className="w-full h-full object-cover" />
                    : <span className="text-2xl">👤</span>
                  }
                </div>
                <div className="min-w-0">
                  <div>
                    <p className="font-bold text-[#1A3666] truncate">{coach.display_name ?? coach.username}</p>
                  </div>
                  {coach.birth_date && (
                    <p className="text-sm text-gray-900 mt-0.5">{calculateAge(coach.birth_date)}</p>
                  )}
                  {coach.badminton_start_date && (
                    <p className="text-xs text-gray-900 mt-0.5">
                      バドミントン歴: {calculateExperience(coach.badminton_start_date)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* メンバー一覧ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#1A3666]">メンバー一覧</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {members?.length ?? 0} 名登録
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/members/new"
            className="bg-[#1A3666] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#2A52A0] transition-colors"
          >
            ＋ メンバー登録
          </Link>
        )}
      </div>

      {/* メンバーカード一覧 */}
      {members && members.filter((m: Member) => isAdmin || m.is_visible).length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.filter((m: Member) => isAdmin || m.is_visible).map((member: Member) => (
            <div key={member.id} className={`relative bg-white rounded-xl border p-5 flex items-center gap-4 transition-all ${member.is_visible ? 'border-[#EAE0A8] hover:shadow-md hover:border-[#F5C800]' : 'border-gray-200 opacity-50'}`}>
              <Link href={`/members/${member.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-14 h-14 rounded-full bg-[#F5C800]/20 border-2 border-[#F5C800] flex items-center justify-center shrink-0 overflow-hidden">
                  {member.photo_url
                    ? <img src={member.photo_url} alt={member.full_name} className="w-full h-full object-cover" />
                    : <span className="text-2xl">👤</span>
                  }
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-[#1A3666] truncate">{member.full_name}</p>
                  <p className="text-sm text-gray-900 mt-0.5">{calculateGrade(member.birth_date)}</p>
                  <p className="text-xs text-gray-900 mt-0.5">加入: {formatDate(member.join_date)}</p>
                  <p className="text-xs text-gray-900 mt-0.5 font-mono">
                    登録番号: {member.registration_number ?? '登録なし'}
                  </p>
                </div>
              </Link>
              {isAdmin && (
                <div className="shrink-0">
                  <VisibilityToggle id={member.id} isVisible={member.is_visible} />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#EAE0A8] py-16 text-center">
          <p className="text-4xl mb-4">🏸</p>
          <p className="text-gray-500 font-medium">メンバーがまだ登録されていません</p>
          {isAdmin && (
            <Link
              href="/members/new"
              className="inline-block mt-4 bg-[#F5C800] text-[#1A3666] text-sm font-bold px-6 py-2.5 rounded-lg hover:bg-[#E5B800] transition-colors"
            >
              最初のメンバーを登録する
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
