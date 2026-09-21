import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

let vapidReady = false
function ensureVapid() {
  if (vapidReady) return
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
  vapidReady = true
}

export type AnnouncementNotifyKind = 'posted' | 'scheduled'

/**
 * 指定した連絡事項について、閲覧対象に合致する購読者へプッシュ通知を送る。
 * push_announcement_log で送信済みを記録し、同じ (購読, 連絡事項, kind) の
 * 二重送信を防ぐ。登録時通知(action)と予約通知(cron)の両方から呼ばれる。
 * 戻り値: 実際に送信した件数。
 */
export async function sendAnnouncementPush(
  announcementId: string,
  kind: AnnouncementNotifyKind
): Promise<number> {
  ensureVapid()
  const admin = createAdminClient()

  const { data: ann } = await admin
    .from('announcements')
    .select('id, title, target')
    .eq('id', announcementId)
    .single()
  if (!ann) return 0

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth_key')
  if (!subs?.length) return 0

  const userIds = [...new Set(subs.map(s => s.user_id))]
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, role')
    .in('id', userIds)
  const roleMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p.role]))

  let sent = 0

  for (const sub of subs) {
    const role = roleMap[sub.user_id]
    if (!role) continue

    // 閲覧対象と同じ判定（一覧の canView と一致させる）
    const relevant =
      role === 'admin' ||
      ann.target === 'all' ||
      (ann.target === 'coach' && role === 'coach') ||
      (ann.target === 'member' && role === 'member')
    if (!relevant) continue

    // 送信済みチェック
    const { data: logged } = await admin
      .from('push_announcement_log')
      .select('id')
      .eq('subscription_id', sub.id)
      .eq('announcement_id', ann.id)
      .eq('kind', kind)
      .maybeSingle()
    if (logged) continue

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        JSON.stringify({
          title: 'お知らせ',
          body: ann.title,
          url: `/announcements/${ann.id}`,
        })
      )
      await admin.from('push_announcement_log').insert({
        subscription_id: sub.id,
        announcement_id: ann.id,
        kind,
      })
      sent++
    } catch (err: unknown) {
      // 期限切れの購読は削除
      if ((err as { statusCode?: number }).statusCode === 410) {
        await admin.from('push_subscriptions').delete().eq('id', sub.id)
      }
    }
  }

  return sent
}
