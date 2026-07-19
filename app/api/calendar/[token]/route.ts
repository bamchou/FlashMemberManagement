import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function escape(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function toJSTDatetime(isoStr: string): string {
  const d = new Date(new Date(isoStr).getTime() + 9 * 60 * 60 * 1000)
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00`
}

function toJSTDate(isoStr: string): string {
  const d = new Date(new Date(isoStr).getTime() + 9 * 60 * 60 * 1000)
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`
}

function toJSTDatePlusOne(isoStr: string): string {
  const d = new Date(new Date(isoStr).getTime() + 9 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000)
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`
}

const TYPE_LABEL: Record<string, string> = {
  practice: '練習', tournament: '大会', event: 'イベント', social: '親睦会', other: 'その他',
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token: raw } = await params
  const token = raw.endsWith('.ics') ? raw.slice(0, -4) : raw

  const admin = createAdminClient()

  const { data: tokenRow } = await admin
    .from('calendar_tokens')
    .select('user_id')
    .eq('token', token)
    .maybeSingle()

  if (!tokenRow) return new NextResponse('Not Found', { status: 404 })

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', tokenRow.user_id)
    .single()

  const role = profile?.role ?? 'member'

  const past = new Date()
  past.setMonth(past.getMonth() - 3)
  const future = new Date()
  future.setFullYear(future.getFullYear() + 1)

  let query = admin
    .from('events')
    .select('id, title, description, event_type, target, start_at, end_at, is_all_day, venue, status')
    .gte('end_at', past.toISOString())
    .lte('start_at', future.toISOString())
    .eq('is_visible', true)
    .order('start_at', { ascending: true })

  if (role === 'member') query = query.in('target', ['all', 'member'])
  else if (role === 'coach') query = query.in('target', ['all', 'coach'])

  const { data: events } = await query

  const now = new Date()
  const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}00Z`

  const vevents = (events ?? []).map(e => {
    const lines = [
      'BEGIN:VEVENT',
      `UID:bcflash-${e.id}@bcflash`,
      `DTSTAMP:${dtstamp}`,
    ]

    if (e.is_all_day) {
      lines.push(`DTSTART;VALUE=DATE:${toJSTDate(e.start_at)}`)
      lines.push(`DTEND;VALUE=DATE:${toJSTDatePlusOne(e.end_at)}`)
    } else {
      lines.push(`DTSTART;TZID=Asia/Tokyo:${toJSTDatetime(e.start_at)}`)
      lines.push(`DTEND;TZID=Asia/Tokyo:${toJSTDatetime(e.end_at)}`)
    }

    const typeLabel = TYPE_LABEL[e.event_type] ?? e.event_type
    lines.push(`SUMMARY:【${typeLabel}】${escape(e.title)}`)

    const descParts: string[] = []
    if (e.status === 'provisional') descParts.push('【仮登録】')
    if (e.description) descParts.push(escape(e.description))
    if (descParts.length) lines.push(`DESCRIPTION:${descParts.join('\\n')}`)

    if (e.venue) lines.push(`LOCATION:${escape(e.venue)}`)

    lines.push('STATUS:CONFIRMED', 'END:VEVENT')
    return lines.join('\r\n')
  }).join('\r\n')

  const ical = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BC FLASH//FlashMemberManagement//JA',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:BC FLASHカレンダー',
    'X-WR-CALDESC:BC FLASHの予定',
    'X-WR-TIMEZONE:Asia/Tokyo',
    'BEGIN:VTIMEZONE',
    'TZID:Asia/Tokyo',
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:+0900',
    'TZOFFSETTO:+0900',
    'TZNAME:JST',
    'END:STANDARD',
    'END:VTIMEZONE',
    vevents,
    'END:VCALENDAR',
  ].join('\r\n')

  return new NextResponse(ical, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="bcflash.ics"',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}
