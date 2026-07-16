import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#1A3666',
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#F5C800',
        fontSize: 18,
        fontWeight: 900,
        letterSpacing: 0,
      }}
    >
      F
    </div>,
    { width: 32, height: 32 }
  )
}
