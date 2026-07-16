import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#1A3666',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 36, fontWeight: 300, letterSpacing: 8, display: 'flex' }}>
          BC
        </div>
        <div style={{ background: '#F5C800', height: 4, width: 100, margin: '10px 0', display: 'flex' }} />
        <div style={{ color: '#F5C800', fontSize: 52, fontWeight: 900, letterSpacing: 4, display: 'flex' }}>
          FLASH
        </div>
      </div>
    ),
    { width: 192, height: 192 }
  )
}
