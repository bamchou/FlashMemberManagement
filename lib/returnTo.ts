/**
 * 更新処理のあとに戻る一覧ページのURLを検証する。
 * アプリ内の、指定した一覧（prefix）配下の相対パスだけを許可し、それ以外は fallback を返す。
 */
export function safeReturnTo(value: unknown, prefix: string, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const v = value.trim()
  if (!v.startsWith('/') || v.startsWith('//') || v.includes('\\') || v.length > 500) return fallback
  if (v !== prefix && !v.startsWith(`${prefix}?`) && !v.startsWith(`${prefix}/`)) return fallback
  return v
}
