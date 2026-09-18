import type { Metadata, Viewport } from 'next'
import './globals.css'
import SplashController from './_components/SplashController'

export const metadata: Metadata = {
  title: 'BC FLASH メンバー管理',
  description: 'バドミントンクラブ FLASH メンバー管理システム',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BC FLASH',
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
