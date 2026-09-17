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
        <script dangerouslySetInnerHTML={{ __html: `
(function(){
  var sa=window.matchMedia('(display-mode:standalone)').matches||navigator.standalone===true;
  if(!sa)return;
  if(sessionStorage.getItem('sp'))return;
  sessionStorage.setItem('sp','1');
  var el=document.createElement('div');
  el.style.cssText='position:fixed;inset:0;z-index:9999;background:url(/splash.png) center/contain no-repeat #000;';
  document.body.appendChild(el);
  setTimeout(function(){el.style.display='none';},3500);
})();
        ` }} />
        {children}
      </body>
    </html>
  )
}
