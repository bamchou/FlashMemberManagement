import type { Metadata, Viewport } from 'next'
import './globals.css'

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
        {/* CSSで即時表示。scriptがコンテンツ描画前に同期実行されPWA判定する */}
        <div id="pwa-splash" />
        <script dangerouslySetInnerHTML={{ __html: `
(function(){
  var el=document.getElementById('pwa-splash');
  var sa=window.matchMedia('(display-mode:standalone)').matches||navigator.standalone===true;
  if(!sa){el.style.display='none';return;}
  if(sessionStorage.getItem('sp')){el.style.display='none';return;}
  sessionStorage.setItem('sp','1');
  setTimeout(function(){el.style.visibility='hidden';el.style.pointerEvents='none';},3500);
})();
        ` }} />
        {children}
      </body>
    </html>
  )
}
