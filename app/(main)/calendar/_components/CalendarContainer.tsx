'use client'

import { useState, useEffect } from 'react'
import type { CalendarEvent, Role } from '@/lib/types'
import CalendarView from './CalendarView'
import AgendaView from './AgendaView'

const STORAGE_KEY = 'calendar-mobile-view'

export default function CalendarContainer({
  year,
  month,
  events,
  role,
  currentUserId,
  creatorMap,
  childEventIds,
}: {
  year: number
  month: number
  events: CalendarEvent[]
  role: Role
  currentUserId: string
  creatorMap: Record<string, string>
  childEventIds?: string[]
}) {
  const [mobileView, setMobileViewState] = useState<'agenda' | 'grid'>('grid')

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as 'agenda' | 'grid' | null
    if (saved) setMobileViewState(saved)
  }, [])

  function setMobileView(view: 'agenda' | 'grid') {
    setMobileViewState(view)
    localStorage.setItem(STORAGE_KEY, view)
  }

  const props = { year, month, events, role, currentUserId, creatorMap, childEventIds }

  const viewToggle = (
    <div className="flex rounded-md border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setMobileView('agenda')}
        className={`p-1.5 transition-colors ${mobileView === 'agenda' ? 'bg-[#1A3666] text-white' : 'bg-white text-gray-400'}`}
        aria-label="リスト表示"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => setMobileView('grid')}
        className={`p-1.5 transition-colors ${mobileView === 'grid' ? 'bg-[#1A3666] text-white' : 'bg-white text-gray-400'}`}
        aria-label="月表示"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>
    </div>
  )

  return (
    <>
      {/* PC: 常にグリッド表示 */}
      <div className="hidden sm:block">
        <CalendarView {...props} />
      </div>

      {/* モバイル */}
      <div className="sm:hidden">
        {mobileView === 'agenda'
          ? <AgendaView {...props} viewToggle={viewToggle} />
          : <div className="overflow-x-auto"><CalendarView {...props} viewToggle={viewToggle} /></div>
        }
      </div>
    </>
  )
}
