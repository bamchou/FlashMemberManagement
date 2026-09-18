import { ImageResponse } from 'next/og'

export const runtime = 'edge'

// splash.png の実寸（この比率で contain 配置する）
const SRC_W = 1086
const SRC_H = 1448

/**
 * iOS の apple-touch-startup-image 用に、端末解像度ぴったりの起動画像を生成する。
 * splash.png を黒背景の中央に contain 配置（CSSスプラッシュと同じ見た目）。
 * contain のサイズは Satori の objectFit に依存せず手計算して明示指定する。
 * 例: /apple-splash?w=1170&h=2532
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const w = Math.min(Number(url.searchParams.get('w')) || 1170, 4000)
  const h = Math.min(Number(url.searchParams.get('h')) || 2532, 4000)

  const scale = Math.min(w / SRC_W, h / SRC_H)
  const imgW = Math.round(SRC_W * scale)
  const imgH = Math.round(SRC_H * scale)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${url.origin}/splash.png`} alt="" width={imgW} height={imgH} />
      </div>
    ),
    {
      width: w,
      height: h,
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    }
  )
}
