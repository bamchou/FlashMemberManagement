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
        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 96, fontWeight: 300, letterSpacing: 20, display: 'flex' }}>
          BC
        </div>
        <div style={{ background: '#F5C800', height: 10, width: 270, margin: '24px 0', display: 'flex' }} />
        <div style={{ color: '#F5C800', fontSize: 138, fontWeight: 900, letterSpacing: 10, display: 'flex' }}>
          FLASH
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  )
}
