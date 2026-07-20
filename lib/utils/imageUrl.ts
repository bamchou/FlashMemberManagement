/**
 * Supabase StorageのURLをImgproxyの画像変換エンドポイントに変換する。
 * ImgproxyはデフォルトでsRGBに変換するため、HDR/P3画像のViewTransition輝度問題を防ぐ。
 */
export function toSupabaseImageUrl(
  url: string | null | undefined,
  width = 300,
  quality = 80
): string | null {
  if (!url) return null
  // /storage/v1/object/public/ -> /storage/v1/render/image/public/
  const transformed = url.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/'
  )
  if (transformed === url) return url // 変換対象外のURLはそのまま返す
  return `${transformed}?width=${width}&quality=${quality}&resize=contain`
}
