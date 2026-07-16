import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
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
      <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 30, fontWeight: 300, letterSpacing: 6, display: 'flex' }}>
        BC
      </div>
      <div style={{ background: '#F5C800', height: 3, width: 90, margin: '8px 0', display: 'flex' }} />
      <div style={{ color: '#F5C800', fontSize: 44, fontWeight: 900, letterSpacing: 3, display: 'flex' }}>
        FLASH
      </div>
    </div>,
    { width: 180, height: 180 }
  )
}
