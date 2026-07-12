'use client'

import { useState } from 'react'
import type { CalendarEvent, Role } from '@/lib/types'
import CalendarView from './CalendarView'
import AgendaView from './AgendaView'

export default function CalendarContainer({
  year,
  month,
  events,
  role,
  currentUserId,
  creatorMap,
}: {
  year: number
  month: number
  events: CalendarEvent[]
  role: Role
  currentUserId: string
  creatorMap: Record<string, string>
}) {
  const [mobileView, setMobileView] = useState<'agenda' | 'grid'>('agenda')

  const props = { year, month, events, role, currentUserId, creatorMap }

  return (
    <>
      {/* PC: 常にグリッド表示 */}
      <div className="hidden sm:block">
        <CalendarView {...props} />
      </div>

      {/* モバイル */}
      <div className="sm:hidden">
        {/* 表示切替ボタン */}
        <div className="flex justify-end mb-3">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMobileView('agenda')}
              className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
                mobileView === 'agenda'
                  ? 'bg-[#1A3666] text-white'
                  : 'bg-white text-gray-500'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              リスト
            </button>
            <button
              type="button"
              onClick={() => setMobileView('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
                mobileView === 'grid'
                  ? 'bg-[#1A3666] text-white'
                  : 'bg-white text-gray-500'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h18M3 10h18M3 15h18M3 20h18M8 3v18M13 3v18" />
              </svg>
              月表示
            </button>
          </div>
        </div>

        {mobileView === 'agenda'
          ? <AgendaView {...props} />
          : <div className="overflow-x-auto"><CalendarView {...props} /></div>
        }
      </div>
    </>
  )
}
