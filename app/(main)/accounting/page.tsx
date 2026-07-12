import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import PaymentStatusButton from './_components/PaymentStatusButton'

function formatDate(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  })
}

type PaymentEvent = {
  id: string
  title: string
  start_at: string
  payment_method: string
  payment_amount: number
  payment_status: string
}

export default async function AccountingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (profile?.role !== 'admin') redirect('/members')

  const adminSupabase = createAdminClient()

  // 確定済みで決済情報がある練習予定を取得
  const { data: events } = await adminSupabase
    .from('events')
    .select('id, title, start_at, payment_method, payment_amount, payment_status')
    .eq('event_type', 'practice')
    .eq('status', 'confirmed')
    .not('payment_method', 'is', null)
    .order('start_at', { ascending: false })

  const rows = (events ?? []) as PaymentEvent[]

  const totalAmount = rows.reduce((sum, e) => sum + (e.payment_amount ?? 0), 0)
  const paidAmount = rows.filter(e => e.payment_status === 'paid').reduce((sum, e) => sum + (e.payment_amount ?? 0), 0)
  const unpaidAmount = totalAmount - paidAmount
  const unpaidCount = rows.filter(e => e.payment_status !== 'paid').length

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold text-[#1A3666] mb-6">経理管理</h1>

      {/* サマリーカード */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-[#EAE0A8] p-4 text-center">
          <p className="text-xs font-semibold text-gray-400 mb-1">合計</p>
          <p className="text-lg font-bold text-[#1A3666]">¥{totalAmount.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-0.5">{rows.length} 件</p>
        </div>
        <div className="bg-white rounded-xl border border-orange-200 p-4 text-center">
          <p className="text-xs font-semibold text-orange-500 mb-1">未払い</p>
          <p className="text-lg font-bold text-orange-600">¥{unpaidAmount.toLocaleString()}</p>
          <p className="text-xs text-orange-400 mt-0.5">{unpaidCount} 件</p>
        </div>
        <div className="bg-white rounded-xl border border-green-200 p-4 text-center">
          <p className="text-xs font-semibold text-green-600 mb-1">支払い済み</p>
          <p className="text-lg font-bold text-green-700">¥{paidAmount.toLocaleString()}</p>
          <p className="text-xs text-green-500 mt-0.5">{rows.length - unpaidCount} 件</p>
        </div>
      </div>

      {/* 一覧 */}
      <div className="bg-white rounded-xl border border-[#EAE0A8] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#EAE0A8] bg-[#F5C800]/10">
          <h2 className="text-sm font-bold text-[#1A3666]">体育館使用料 一覧</h2>
        </div>

        {rows.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-400 text-sm">確定済みの練習予定がまだありません</p>
            <Link href="/calendar" className="text-xs text-[#1A3666] underline mt-2 inline-block">
              カレンダーで練習を確定する
            </Link>
          </div>
        ) : (
          <>
            {/* デスクトップ: テーブル */}
            <table className="hidden sm:table w-full text-sm">
              <thead className="bg-gray-50 border-b border-[#EAE0A8]">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs">日付</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs">タイトル</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs">決済方法</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-500 text-xs">金額</th>
                  <th className="text-center px-5 py-3 font-semibold text-gray-500 text-xs">状態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE0A8]">
                {rows.map(e => (
                  <tr key={e.id} className={`hover:bg-gray-50 transition-colors ${e.payment_status === 'paid' ? 'opacity-60' : ''}`}>
                    <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{formatDate(e.start_at)}</td>
                    <td className="px-5 py-3">
                      <Link href={`/calendar/${e.id}`} className="font-semibold text-[#1A3666] hover:underline">
                        {e.title}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{e.payment_method}</td>
                    <td className="px-5 py-3 text-right font-semibold text-[#1A3666]">
                      ¥{e.payment_amount.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <PaymentStatusButton eventId={e.id} status={e.payment_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* モバイル: カード */}
            <div className="sm:hidden divide-y divide-[#EAE0A8]">
              {rows.map(e => (
                <div key={e.id} className={`px-4 py-4 ${e.payment_status === 'paid' ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <Link href={`/calendar/${e.id}`} className="font-semibold text-[#1A3666] hover:underline block truncate">
                        {e.title}
                      </Link>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(e.start_at)}</p>
                    </div>
                    <p className="text-base font-bold text-[#1A3666] shrink-0">
                      ¥{e.payment_amount.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{e.payment_method}</span>
                    <PaymentStatusButton eventId={e.id} status={e.payment_status} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
