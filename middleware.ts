import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // API ルートは認証不要で通す
  return NextResponse.next()
}

export const config = {
  matcher: [
    // API ルートと静的ファイルは除外して、ページルートのみマッチ
    '/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.json).*)',
  ],
}
