'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { markAnnouncementRead } from '../../actions'

// 詳細ページを開いたら既読化する。新規既読時はナビの未確認バッジを更新するため refresh。
export default function AnnouncementReadMarker({ id }: { id: string }) {
  const router = useRouter()
  const done = useRef(false)

  useEffect(() => {
    if (done.current) return
    done.current = true
    markAnnouncementRead(id).then(res => {
      if (res?.newlyRead) router.refresh()
    }).catch(() => {})
  }, [id, router])

  return null
}
