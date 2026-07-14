import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function DuesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (profile?.role !== 'admin') redirect('/members')

  return (
    <div className="max-w-2xl">
      <Link href="/accounting" className="text-sm text-[#1A3666] hover:underline mb-4 inline-block">
        ← 経理管理に戻る
      </Link>
      <h1 className="text-xl font-bold text-[#1A3666] mb-6">月謝管理</h1>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <p className="text-blue-700 font-bold text-lg mb-2">月謝管理機能</p>
        <p className="text-blue-600 text-sm mb-1">現在開発中です。</p>
        <p className="text-blue-500 text-xs">月ごとの月謝収納状況の管理・確認ができるようになる予定です。</p>
      </div>
    </div>
  )
}
