'use client'

// 年間集計を CSV で書き出す（Excel で文字化けしないよう BOM 付き UTF-8）
export default function CsvDownloadButton({
  filename,
  rows,
}: {
  filename: string
  rows: (string | number)[][]
}) {
  function download() {
    const escape = (v: string | number) => {
      const s = String(v)
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const csv = '﻿' + rows.map(r => r.map(escape).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      type="button"
      onClick={download}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1A3666] border border-[#1A3666] px-4 py-2 rounded-lg hover:bg-[#1A3666] hover:text-white transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      CSVで書き出す
    </button>
  )
}
