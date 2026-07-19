import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import BibManagementClient from './_components/BibManagementClient'

export default async function BibManagementPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (profile?.role !== 'admin') redirect('/members')

  const adminSupabase = createAdminClient()
  const { data: rawRows } = await adminSupabase
    .from('bib_requests')
    .select('id, member_id, status, requested_at, ordered_at, delivered_at, members(full_name, full_name_kana, birth_date, gender, photo_url)')
    .order('requested_at', { ascending: true })

  const rows = (rawRows ?? []) as unknown as {
    id: string
    member_id: string
    status: 'requested' | 'ordered' | 'delivered'
    requested_at: string
    ordered_at: string | null
    delivered_at: string | null
    members: {
      full_name: string
      full_name_kana: string | null
      birth_date: string
      gender: string | null
      photo_url: string | null
    } | null
  }[]

  return (
    <div className="max-w-2xl">
      <Link href="/accounting" className="text-sm text-[#1A3666] hover:underline mb-4 inline-block">
        ← 経理管理に戻る
      </Link>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[#1A3666]">ゼッケン管理</h1>
        <p className="text-xs text-gray-400">全 {rows.length} 件</p>
      </div>
      <BibManagementClient rows={rows} />
    </div>
  )
}
