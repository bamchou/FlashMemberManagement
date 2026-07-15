'use client'

import { useState, useEffect } from 'react'

type Props = {
  src: string | null | undefined
  alt: string
  containerClassName: string
  fallbackSize?: string
}

export default function TappablePhoto({ src, alt, containerClassName, fallbackSize = 'text-2xl' }: Props) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  return (
    <>
      <div
        className={`${containerClassName}${src ? ' cursor-pointer active:opacity-70' : ''}`}
        onClick={(e) => {
          if (!src) return
          e.preventDefault()
          e.stopPropagation()
          setIsOpen(true)
        }}
      >
        {src
          ? <img src={src} alt={alt} className="w-full h-full object-cover object-top" />
          : <span className={fallbackSize}>👤</span>}
      </div>

      {isOpen && src && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-6"
          onClick={(e) => { e.stopPropagation(); setIsOpen(false) }}
        >
          <div className="relative max-w-xs w-full" onClick={e => e.stopPropagation()}>
            <button
              className="absolute -top-9 right-0 text-white text-sm font-semibold flex items-center gap-1.5 hover:text-gray-300 transition-colors"
              onClick={(e) => { e.stopPropagation(); setIsOpen(false) }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              閉じる
            </button>
            <img
              src={src}
              alt={alt}
              className="w-full rounded-xl object-contain max-h-[80vh]"
            />
            <p className="text-center text-white/60 text-xs mt-3">{alt}</p>
          </div>
        </div>
      )}
    </>
  )
}
