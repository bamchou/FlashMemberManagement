import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'バドミントンクラブ メンバー管理システム',
  description: 'バドミントンクラブのメンバー情報・戦績・連絡事項を管理するシステム',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
