import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/lib/types'
import DeleteUserButton from './_components/DeleteUserButton'
import UserVisibilityToggle from './_components/VisibilityToggle'

const ROLE_LABELS: Record<string, { label: string; className: string }> = {
  admin:  { label: '管理者', className: 'bg-[#1A3666] text-white' },
  coach:  { label: '指導者', className: 'bg-[#2A52A0] text-white' },
  member: { label: '保護者', className: 'bg-[#F5C800] text-[#1A3666]' },
}

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  if ((profile?.role as Role) !== 'admin') redirect('/members')

  const { data: profilesRaw } = await supabase
    .from('profiles')
    .select('id, username, display_name, display_name_kana, role, show_on_members_page')

  const ROLE_ORDER: Record<string, number> = { admin: 0, coach: 1, member: 2 }
  const profiles = [...(profilesRaw ?? [])].sort((a, b) => {
    const roleDiff = (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9)
    if (roleDiff !== 0) return roleDiff
    const kanaA = a.display_name_kana ?? a.display_name ?? ''
    const kanaB = b.display_name_kana ?? b.display_name ?? ''
    return kanaA.localeCompare(kanaB, 'ja')
  })

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[#1A3666]">ユーザー管理</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/users/guardians"
            className="text-sm font-semibold text-[#1A3666] border border-[#1A3666] px-4 py-2 rounded-lg hover:bg-[#1A3666] hover:text-white transition-colors"
          >
            保護者管理
          </Link>
          <Link
            href="/users/new"
            className="text-sm font-semibold bg-[#1A3666] text-white px-4 py-2 rounded-lg hover:bg-[#2A52A0] transition-colors"
          >
            ＋ ユーザーを登録
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#EAE0A8] overflow-hidden">
        {profiles && profiles.length > 0 ? (
          <>
            {/* モバイル: カード表示 */}
            <div className="sm:hidden divide-y divide-[#EAE0A8]">
              {profiles.map((p) => {
                const roleInfo = ROLE_LABELS[p.role] ?? { label: p.role, className: 'bg-gray-100 text-gray-600' }
                const isSelf = p.id === user!.id
                const isCoachOrAdmin = p.role === 'admin' || p.role === 'coach'
                return (
                  <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-[#1A3666] truncate">{p.username ?? '—'}</p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${roleInfo.className}`}>
                          {roleInfo.label}
                        </span>
                      </div>
                      {p.display_name && (
                        <p className="text-xs text-gray-500 mt-0.5">{p.display_name}</p>
                      )}
                      {p.display_name_kana && (
                        <p className="text-xs text-gray-400">{p.display_name_kana}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isCoachOrAdmin && (
                        <UserVisibilityToggle id={p.id} show={p.show_on_members_page ?? false} />
                      )}
                      <Link href={`/users/${p.id}/edit`} className="text-xs text-[#1A3666] font-semibold w-6 text-center">
                        編集
                      </Link>
                      <span className={isSelf ? 'invisible' : ''}>
                        <DeleteUserButton userId={p.id} username={p.username} />
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* デスクトップ: テーブル表示 */}
            <table className="hidden sm:table w-full text-sm">
              <thead className="bg-[#F5C800]/20 border-b border-[#EAE0A8]">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-[#1A3666]">ユーザー名</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#1A3666]">表示名</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#1A3666]">役割</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#1A3666]">一覧表示</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE0A8]">
                {profiles.map((p) => {
                  const roleInfo = ROLE_LABELS[p.role] ?? { label: p.role, className: 'bg-gray-100 text-gray-600' }
                  const isSelf = p.id === user!.id
                  const isCoachOrAdmin = p.role === 'admin' || p.role === 'coach'
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-[#1A3666]">{p.username ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">
                        <span>{p.display_name ?? '—'}</span>
                        {p.display_name_kana && (
                          <span className="block text-xs text-gray-400">{p.display_name_kana}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roleInfo.className}`}>
                          {roleInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isCoachOrAdmin && (
                          <UserVisibilityToggle id={p.id} show={p.show_on_members_page ?? false} />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-3">
                          <Link href={`/users/${p.id}/edit`} className="text-xs text-[#1A3666] hover:underline">
                            編集
                          </Link>
                          <span className={isSelf ? 'invisible' : ''}>
                            <DeleteUserButton userId={p.id} username={p.username} />
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </>
        ) : (
          <div className="py-16 text-center">
            <p className="text-gray-400 text-sm">ユーザーが登録されていません</p>
          </div>
        )}
      </div>
    </div>
  )
}
