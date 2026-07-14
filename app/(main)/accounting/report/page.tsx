import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function ReportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (profile?.role !== 'admin') redirect('/members')

  return (
    <div className="max-w-2xl">
      <Link href="/accounting" className="text-sm text-[#1A3666] hover:underline mb-4 inline-block">
        ← 経理管理に戻る
      </Link>
      <h1 className="text-xl font-bold text-[#1A3666] mb-6">確定申告レポート</h1>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-blue-700 font-bold text-lg mb-2">確定申告レポート機能</p>
        <p className="text-blue-600 text-sm mb-1">現在開発中です。</p>
        <p className="text-blue-500 text-xs">年間の収支をまとめ、確定申告用のCSVデータをダウンロードできるようになる予定です。</p>
      </div>
    </div>
  )
}
