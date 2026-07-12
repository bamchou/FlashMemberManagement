import { createAdminClient } from '@/lib/supabase/admin'
import LoginForm from './LoginForm'

const EVENT_TYPE_STYLE: Record<string, { bg: string; label: string }> = {
  practice:   { bg: 'bg-blue-100 text-blue-700',     label: '練習' },
  tournament: { bg: 'bg-red-100 text-red-700',       label: '大会' },
  event:      { bg: 'bg-green-100 text-green-700',   label: 'イベント' },
  social:     { bg: 'bg-orange-100 text-orange-700', label: '親睦会' },
  other:      { bg: 'bg-gray-100 text-gray-600',     label: 'その他' },
}

function formatTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export default async function LoginPage() {
  const nowUTC = new Date()
  const nowJST = new Date(nowUTC.getTime() + 9 * 60 * 60 * 1000)
  const todayDateStr = nowJST.toISOString().slice(0, 10)
  const todayStartUTC = new Date(`${todayDateStr}T00:00:00+09:00`).toISOString()
  const todayEndUTC   = new Date(`${todayDateStr}T23:59:59+09:00`).toISOString()

  const adminSupabase = createAdminClient()
  const { data: todayEvents } = await adminSupabase
    .from('events')
    .select('id, title, event_type, start_at, end_at, status')
    .gte('start_at', todayStartUTC)
    .lte('start_at', todayEndUTC)
    .eq('is_visible', true)
    .in('target', ['all'])
    .order('start_at', { ascending: true })

  const [month, day] = [nowJST.getUTCMonth() + 1, nowJST.getUTCDate()]

  return (
    <div className="min-h-screen bg-[#F5C800] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">

        {/* ヘッダー */}
        <div className="bg-[#1A3666] px-8 py-8 text-center">
          <div className="text-4xl mb-3">🏸</div>
          <h1 className="text-white font-bold text-base leading-relaxed tracking-wide">
            BC FLASH
            <br />
            メンバー管理システム
          </h1>
        </div>

        {/* 本日の予定 */}
        {todayEvents && todayEvents.length > 0 && (
          <div className="px-6 pt-5 pb-1">
            <p className="text-xs font-bold text-[#1A3666] mb-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F5C800] inline-block" />
              本日の予定（{month}/{day}）
            </p>
            <div className="space-y-2">
              {todayEvents.map((e: { id: string; title: string; event_type: string; start_at: string; end_at: string; status: string }) => {
                const { bg, label } = EVENT_TYPE_STYLE[e.event_type] ?? EVENT_TYPE_STYLE.other
                return (
                  <div key={e.id} className="flex items-center gap-2 bg-[#F5F8FF] rounded-lg px-3 py-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${bg}`}>
                      {label}
                    </span>
                    <span className="text-xs text-gray-500 shrink-0">
                      {formatTime(e.start_at)}〜{formatTime(e.end_at)}
                    </span>
                    <span className="text-xs font-semibold text-[#1A3666] truncate">{e.title}</span>
                    {e.event_type === 'practice' && e.status === 'provisional' && (
                      <span className="text-[10px] font-bold text-orange-500 shrink-0">仮</span>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="border-b border-[#EAE0A8] mt-4" />
          </div>
        )}

        {/* フォーム */}
        <div className="px-8 py-7">
          <p className="text-sm text-gray-500 mb-5 text-center">
            ログインしてください
          </p>
          <LoginForm />
        </div>

      </div>
    </div>
  )
}
