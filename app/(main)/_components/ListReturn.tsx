'use client'

import { useEffect, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * 一覧ページのURL（年月・タブなど）を覚えておき、詳細画面での更新後や
 * 「一覧に戻る」で、詳細に入る直前に見ていた一覧へ戻すための部品。
 * 保存先はタブごとの sessionStorage。
 */
export type ListSection = 'calendar' | 'announcements' | 'members' | 'users'

const storageKey = (section: ListSection) => `list-return:${section}`

/** 一覧ページに置く。表示中のURLを覚える（年月やタブが変わるたびに更新） */
export function RememberListUrl({ section }: { section: ListSection }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  useEffect(() => {
    const q = searchParams.toString()
    try {
      sessionStorage.setItem(storageKey(section), q ? `${pathname}?${q}` : pathname)
    } catch {}
  }, [section, pathname, searchParams])
  return null
}

const noopSubscribe = () => () => {}

/** 覚えている一覧URL（無ければ fallback） */
export function useReturnTo(section: ListSection, fallback: string): string {
  return useSyncExternalStore(
    noopSubscribe,
    () => {
      try { return sessionStorage.getItem(storageKey(section)) ?? fallback } catch { return fallback }
    },
    () => fallback,
  )
}

/** フォームに入れる隠し項目。サーバー側は return_to を見て戻り先を決める */
export function ReturnToInput({ section, fallback }: { section: ListSection; fallback: string }) {
  const value = useReturnTo(section, fallback)
  return <input type="hidden" name="return_to" value={value} />
}

/** 「← 一覧に戻る」リンク */
export function BackToListLink({
  section, fallback, className, children,
}: {
  section: ListSection
  fallback: string
  className?: string
  children: React.ReactNode
}) {
  const href = useReturnTo(section, fallback)
  return <Link href={href} className={className}>{children}</Link>
}
