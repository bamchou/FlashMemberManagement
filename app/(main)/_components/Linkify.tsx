// 文章中の http(s):// で始まるURLをリンクにする（それ以外の文字はそのまま表示）
const URL_PATTERN = /(https?:\/\/[^\s<>"'「」『』（）()【】、。，．！？]+)/g
// URLの末尾に付きがちな記号はリンクに含めない
const TRAILING = /[.,;:!?)\]}]+$/

export default function Linkify({ text }: { text: string }) {
  const parts = text.split(URL_PATTERN)
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 0) return part
        const trailing = part.match(TRAILING)?.[0] ?? ''
        const url = trailing ? part.slice(0, -trailing.length) : part
        return (
          <span key={i}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline break-all hover:text-blue-800"
            >
              {url}
            </a>
            {trailing}
          </span>
        )
      })}
    </>
  )
}
