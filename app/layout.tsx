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
        {/* Reactより先に実行してコンテンツ表示前にSplashを表示 */}
        <script dangerouslySetInnerHTML={{ __html: `
(function(){
  try {
    var sa = window.matchMedia('(display-mode:standalone)').matches || navigator.standalone===true;
    if(!sa || sessionStorage.getItem('splash')) return;
    sessionStorage.setItem('splash','1');
    var d=document.createElement('div');
    d.style.cssText='position:fixed;inset:0;z-index:9999;background:#000;display:flex;align-items:center;justify-content:center;';
    var img=document.createElement('img');
    img.src='/splash.png';
    img.style.cssText='width:100%;height:100%;object-fit:contain;';
    d.appendChild(img);
    document.body.appendChild(d);
    setTimeout(function(){
      d.style.transition='opacity 1s ease';
      d.style.opacity='0';
      d.style.pointerEvents='none';
      setTimeout(function(){ d.remove(); },1000);
    },3500);
  }catch(e){}
})();
        ` }} />
        {children}
      </body>
    </html>
  )
}
