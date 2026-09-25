import Link from 'next/link'

/** その日の体育館予約担当（isMine: 自分が担当） */
export type GymDuty = { isMine: boolean; name: string }

/** 月表示のセル内に出す小さなラベル */
export function GymDutyCellBadge({ date, duty }: { date: string; duty: GymDuty }) {
  return (
    <Link
      href={`/calendar/gym-reservation/${date}`}
      className={`block text-[10px] sm:text-[11px] font-semibold px-0.5 sm:px-1 py-0.5 rounded truncate leading-tight border ${
        duty.isMine ? 'bg-sky-100 text-sky-800 border-sky-300' : 'bg-white text-sky-700 border-sky-200'
      }`}
      title={duty.isMine ? 'あなたが体育館予約の担当です' : `体育館予約：${duty.name}`}
    >
      🏢 {duty.isMine ? '体育館予約' : <>予約<span className="hidden sm:inline"> {duty.name}</span></>}
    </Link>
  )
}

/** リスト表示のカード */
export function GymDutyCard({ date, duty }: { date: string; duty: GymDuty }) {
  return (
    <Link
      href={`/calendar/gym-reservation/${date}`}
      className="flex items-center gap-2.5 bg-sky-50 rounded-xl border border-sky-200 p-3 active:bg-sky-100"
    >
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 shrink-0">🏢 体育館予約</span>
      <span className="text-sm font-semibold text-[#1A3666] truncate">
        {duty.isMine ? 'あなたが予約担当です' : `担当：${duty.name}`}
      </span>
    </Link>
  )
}
