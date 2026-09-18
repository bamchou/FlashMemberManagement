import type { Metadata, Viewport } from 'next'
import './globals.css'
import SplashController from './_components/SplashController'

// iPhone起動時にFLASH画像をフルスクリーン表示するための起動画像。
// iOSは端末解像度と完全一致する画像でのみ表示するため、端末ごとに指定する。
// url=/apple-splash?w={px幅}&h={px高さ}（=CSS px × DPR）
const appleStartupImages = [
  // SE(2/3), 8, 7, 6s, 6                     375x667 @2
  { device: [375, 667, 2], px: [750, 1334] },
  // 8+, 7+, 6+                                414x736 @3
  { device: [414, 736, 3], px: [1242, 2208] },
  // X, XS, 11 Pro, 12 mini, 13 mini           375x812 @3
  { device: [375, 812, 3], px: [1125, 2436] },
  // XR, 11                                    414x896 @2
  { device: [414, 896, 2], px: [828, 1792] },
  // XS Max, 11 Pro Max                        414x896 @3
  { device: [414, 896, 3], px: [1242, 2688] },
  // 12, 12 Pro, 13, 13 Pro, 14                390x844 @3
  { device: [390, 844, 3], px: [1170, 2532] },
  // 12 Pro Max, 13 Pro Max, 14 Plus           428x926 @3
  { device: [428, 926, 3], px: [1284, 2778] },
  // 14 Pro, 15, 15 Pro, 16                    393x852 @3
  { device: [393, 852, 3], px: [1179, 2556] },
  // 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus  430x932 @3
  { device: [430, 932, 3], px: [1290, 2796] },
  // 16 Pro                                    402x874 @3
  { device: [402, 874, 3], px: [1206, 2622] },
  // 16 Pro Max                                440x956 @3
  { device: [440, 956, 3], px: [1320, 2868] },
].map(({ device: [dw, dh, dpr], px: [pw, ph] }) => ({
  url: `/apple-splash?w=${pw}&h=${ph}`,
  media: `screen and (device-width: ${dw}px) and (device-height: ${dh}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`,
}))

export const metadata: Metadata = {
  title: 'BC FLASH メンバー管理',
  description: 'バドミントンクラブ FLASH メンバー管理システム',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BC FLASH',
    startupImage: appleStartupImages,
  },
}

export const viewport: Viewport = {
  themeColor: '#1A3666',
  colorScheme: 'light',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full flex flex-col">
        <SplashController />
        {/* PWA起動時はsplash表示中このラッパーをvisibility:hiddenで隠す。
            コンテンツ自体はDOM/hydrationされるが描画されないため、
            View Transitionのスナップショット対象にもならず漏れ表示が起きない。 */}
        <div id="app-root" className="flex-1 flex flex-col">
          {children}
        </div>
      </body>
    </html>
  )
}
