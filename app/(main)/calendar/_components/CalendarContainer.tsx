'use client'

import { useState, useEffect } from 'react'
import type { CalendarEvent, Role } from '@/lib/types'
import CalendarView from './CalendarView'
import AgendaView from './AgendaView'
import type { GymDuty } from './GymDutyBadge'

const STORAGE_KEY = 'calendar-mobile-view'

export default function CalendarContainer({
  year,
  month,
  events,
  role,
  currentUserId,
  creatorMap,
  childEventIds,
  gymDuties,
}: {
  year: number
  month: number
  events: CalendarEvent[]
  role: Role
  currentUserId: string
  creatorMap: Record<string, string>
  childEventIds?: string[]
  gymDuties?: Record<string, GymDuty>
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

  const props = { year, month, events, role, currentUserId, creatorMap, childEventIds, gymDuties }

  return (
    <>
      {/* PC: 常にグリッド表示 */}
      <div className="hidden sm:block">
        <CalendarView {...props} />
      </div>

      {/* モバイル */}
      <div className="sm:hidden">
        {mobileView === 'agenda'
          ? <AgendaView {...props} mobileView={mobileView} onSwitchMobileView={setMobileView} />
          : <div className="overflow-x-auto"><CalendarView {...props} mobileView={mobileView} onSwitchMobileView={setMobileView} /></div>
        }
      </div>
    </>
  )
}
