import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/lib/types'

function formatDateJa(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return `${y}年${m}月${d}日`
}

function formatMonthJa(iso: string) {
  const [y, m] = iso.split('-').map(Number)
  return `${y}年${m}月`
}

const ROLE_LABEL: Record<Role, string> = {
  admin: '管理者',
  coach: '指導者',
  member: '保護者',
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, display_name_kana, role, photo_url, qualifications, birth_date, badminton_start_date, coach_rate_practice')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const role = profile.role as Role
  const isCoach = role === 'coach'

  return (
    <div className="max-w-lg">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#1A3666]">マイプロフィール</h1>
        {isCoach && (
          <a
            href="/profile/edit"
            className="text-sm font-semibold text-[#1A3666] border border-[#1A3666] px-3.5 py-1.5 rounded-lg hover:bg-[#1A3666] hover:text-white transition-colors"
          >
            編集
          </a>
        )}
      </div>

      <div className="bg-white rounded-xl border border-[#EAE0A8] p-6 space-y-5">
        {/* 写真・名前 */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#F5C800]/20 border-2 border-[#F5C800] flex items-center justify-center overflow-hidden shrink-0">
            {profile.photo_url
              ? <img src={profile.photo_url} alt={profile.display_name ?? ''} className="w-full h-full object-cover" />
              : <span className="text-2xl">👤</span>}
          </div>
          <div>
            <p className="text-lg font-bold text-[#1A3666]">{profile.display_name ?? profile.username}</p>
            {profile.display_name_kana && (
              <p className="text-xs text-gray-400">{profile.display_name_kana}</p>
            )}
            <span className="inline-block mt-1 text-xs font-bold bg-[#1A3666] text-white px-2.5 py-0.5 rounded-full">
              {ROLE_LABEL[role]}
            </span>
          </div>
        </div>

        <div className="border-t border-[#EAE0A8] pt-4 space-y-3">
          {/* ユーザー名 */}
          <div className="flex items-center justify-between py-2">
            <span className="text-sm font-semibold text-gray-500">ログインID</span>
            <span className="text-sm font-mono text-[#1A3666]">{profile.username}</span>
          </div>

          {/* 資格 */}
          {profile.qualifications && (
            <div className="flex items-start justify-between py-2 gap-4">
              <span className="text-sm font-semibold text-gray-500 shrink-0">資格・免許</span>
              <span className="text-sm text-[#1A3666] text-right whitespace-pre-wrap">{profile.qualifications}</span>
            </div>
          )}

          {/* 指導者のみ：生年月日・バドミントン開始年月 */}
          {isCoach && profile.birth_date && (
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-semibold text-gray-500">生年月日</span>
              <span className="text-sm text-[#1A3666]">
                {formatDateJa(profile.birth_date as string)}
              </span>
            </div>
          )}
          {isCoach && profile.badminton_start_date && (
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-semibold text-gray-500 shrink-0">バドミントン開始</span>
              <span className="text-sm text-[#1A3666]">
                {formatMonthJa(profile.badminton_start_date as string)}
              </span>
            </div>
          )}
        </div>

        {/* バイト代単価（指導者のみ） */}
        {isCoach && (
          <div className="border-t border-[#EAE0A8] pt-4">
            <p className="text-sm font-bold text-[#1A3666] mb-3">バイト代単価</p>
            <div className="bg-[#F5F8FF] border border-[#D0DCF5] rounded-xl p-4 text-center inline-block min-w-40">
              <p className="text-xs font-semibold text-gray-500 mb-1">練習（1回あたり）</p>
              {profile.coach_rate_practice != null ? (
                <p className="text-xl font-bold text-[#1A3666]">
                  {profile.coach_rate_practice.toLocaleString()}
                  <span className="text-sm font-semibold ml-0.5">円</span>
                </p>
              ) : (
                <p className="text-sm text-gray-400">未設定</p>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2">大会帯同は参加費の山分けで計算されます。単価の変更は管理者にお問い合わせください</p>
          </div>
        )}
      </div>
    </div>
  )
}
