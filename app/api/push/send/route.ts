import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

const CRON_WINDOW_MINUTES = 5

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const token = req.nextUrl.searchParams.get('secret') ?? req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret && token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminSupabase = createAdminClient()
  const now = new Date()

  const { data: subscriptions } = await adminSupabase
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth_key, hours_before')

  if (!subscriptions?.length) return NextResponse.json({ sent: 0 })

  // ユーザーのロール取得
  const userIds = [...new Set(subscriptions.map(s => s.user_id))]
  const { data: profiles } = await adminSupabase
    .from('profiles')
    .select('id, role')
    .in('id', userIds)
  const roleMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p.role]))

  // 保護者 → 子供のメンバーID マッピング
  const guardianIds = (profiles ?? []).filter(p => p.role === 'member').map(p => p.id)
  const guardianMemberMap: Record<string, string[]> = {}
  if (guardianIds.length > 0) {
    const { data: members } = await adminSupabase
      .from('members')
      .select('id, guardian_id')
      .in('guardian_id', guardianIds)
      .eq('approval_status', 'approved')
    for (const m of (members ?? [])) {
      if (!guardianMemberMap[m.guardian_id]) guardianMemberMap[m.guardian_id] = []
      guardianMemberMap[m.guardian_id].push(m.id)
    }
  }

  const uniqueHours = [...new Set(subscriptions.map(s => s.hours_before))]
  let sent = 0

  for (const hours of uniqueHours) {
    const windowStart = new Date(now.getTime() + hours * 60 * 60 * 1000)
    const windowEnd = new Date(windowStart.getTime() + CRON_WINDOW_MINUTES * 60 * 1000)

    const { data: events } = await adminSupabase
      .from('events')
      .select('id, title, start_at, target')
      .gte('start_at', windowStart.toISOString())
      .lt('start_at', windowEnd.toISOString())
      .eq('is_visible', true)

    if (!events?.length) continue

    const subsForHour = subscriptions.filter(s => s.hours_before === hours)

    for (const event of events) {
      // 参加登録者（保護者の子供チェック用）
      const { data: participants } = await adminSupabase
        .from('event_participants')
        .select('member_id')
        .eq('event_id', event.id)
      const participantIds = new Set((participants ?? []).map(p => p.member_id))

      for (const sub of subsForHour) {
        const role = roleMap[sub.user_id]

        // 通知対象か判定
        let relevant = false
        if (role === 'admin') {
          relevant = true
        } else if (role === 'coach') {
          relevant = event.target === 'all' || event.target === 'coach'
        } else if (role === 'member') {
          if (event.target === 'all' || event.target === 'member') {
            const myMemberIds = guardianMemberMap[sub.user_id] ?? []
            relevant = myMemberIds.some(mid => participantIds.has(mid))
          }
        }

        if (!relevant) continue

        // 送信済みチェック
        const { data: logged } = await adminSupabase
          .from('push_notification_log')
          .select('subscription_id')
          .eq('subscription_id', sub.id)
          .eq('event_id', event.id)
          .maybeSingle()

        if (logged) continue

        const timeStr = new Date(event.start_at).toLocaleString('ja-JP', {
          timeZone: 'Asia/Tokyo',
          month: 'numeric', day: 'numeric',
          hour: '2-digit', minute: '2-digit', hour12: false,
        })

        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
            JSON.stringify({
              title: 'BC FLASH',
              body: `${hours}時間後: ${event.title}（${timeStr}）`,
              url: `/calendar/${event.id}`,
            })
          )
          await adminSupabase.from('push_notification_log').insert({
            subscription_id: sub.id,
            event_id: event.id,
          })
          sent++
        } catch (err: unknown) {
          // 期限切れの購読を削除
          if ((err as { statusCode?: number }).statusCode === 410) {
            await adminSupabase.from('push_subscriptions').delete().eq('id', sub.id)
          }
        }
      }
    }
  }

  // 7日以上前のログを削除
  const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  await adminSupabase.from('push_notification_log').delete().lt('sent_at', cutoff.toISOString())

  return NextResponse.json({ sent })
}
