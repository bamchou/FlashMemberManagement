import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import GuardianListClient from './_components/GuardianListClient'

type GuardianWithMembers = {
  id: string
  username: string
  displayName: string | null
  pendingReenrollment: boolean
  members: { id: string; name: string; withdrawnAt: string | null }[]
}

export default async function GuardiansPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (profile?.role !== 'admin') redirect('/members')

  const admin = createAdminClient()

  const [{ data: guardians }, { data: allMembers }] = await Promise.all([
    admin
      .from('profiles')
      .select('id, username, display_name, is_auth_locked, pending_reenrollment')
      .eq('role', 'member')
      .order('created_at', { ascending: true }),
    admin
      .from('members')
      .select('id, full_name, guardian_id, withdrawn_at')
      .order('birth_date', { ascending: true })
      .order('join_date', { ascending: true }),
  ])

  const membersByGuardian = new Map<string, { id: string; name: string; withdrawnAt: string | null }[]>()
  for (const m of allMembers ?? []) {
    if (!m.guardian_id) continue
    if (!membersByGuardian.has(m.guardian_id)) membersByGuardian.set(m.guardian_id, [])
    membersByGuardian.get(m.guardian_id)!.push({
      id: m.id,
      name: m.full_name,
      withdrawnAt: m.withdrawn_at,
    })
  }

  const active: GuardianWithMembers[] = []
  const withdrawn: GuardianWithMembers[] = []

  for (const g of guardians ?? []) {
    const item: GuardianWithMembers = {
      id: g.id,
      username: g.username ?? '',
      displayName: g.display_name,
      pendingReenrollment: g.pending_reenrollment ?? false,
      members: membersByGuardian.get(g.id) ?? [],
    }
    if (g.is_auth_locked) {
      withdrawn.push(item)
    } else {
      active.push(item)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/users" className="text-sm text-[#1A3666] hover:underline">← ユーザー管理</Link>
        <h1 className="text-xl font-bold text-[#1A3666] mt-2">保護者管理</h1>
        <p className="text-sm text-gray-500 mt-0.5">保護者の退会・再入会処理を行います</p>
      </div>
      <GuardianListClient active={active} withdrawn={withdrawn} />
    </div>
  )
}
