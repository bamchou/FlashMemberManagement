'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { createAnnouncement, type AnnouncementFormState } from '../actions'

export default function AnnouncementForm() {
  const [state, action, pending] = useActionState<AnnouncementFormState, FormData>(
    createAnnouncement,
    undefined
  )
  const router = useRouter()

  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="title" className="block text-sm font-semibold text-[#1A3666] mb-1.5">
          タイトル<span className="text-red-500 ml-1">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          placeholder="例: 7月の練習スケジュールについて"
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white"
        />
      </div>

      <div>
        <label htmlFor="content" className="block text-sm font-semibold text-[#1A3666] mb-1.5">
          内容<span className="text-red-500 ml-1">*</span>
        </label>
        <textarea
          id="content"
          name="content"
          rows={8}
          required
          placeholder="連絡内容を入力してください"
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white resize-none"
        />
      </div>

      {/* 宛先 */}
      <div>
        <label htmlFor="target" className="block text-sm font-semibold text-[#1A3666] mb-1.5">
          閲覧対象<span className="text-red-500 ml-1">*</span>
        </label>
        <select
          id="target"
          name="target"
          required
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white"
        >
          <option value="all">全員</option>
          <option value="coach">指導者のみ</option>
          <option value="member">保護者のみ</option>
        </select>
      </div>

      {/* 公開期間 */}
      <div className="bg-[#FFFDF0] border border-[#EAE0A8] rounded-lg p-4 space-y-3">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
          公開期間（未設定の場合は常時表示）
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="publish_start" className="block text-xs font-semibold text-[#1A3666] mb-1">
              開始日
            </label>
            <input
              id="publish_start"
              name="publish_start"
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white"
            />
          </div>
          <div>
            <label htmlFor="publish_end" className="block text-xs font-semibold text-[#1A3666] mb-1">
              終了日
            </label>
            <input
              id="publish_end"
              name="publish_end"
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white"
            />
          </div>
        </div>
      </div>

      {/* 添付ファイル */}
      <div>
        <label className="block text-sm font-semibold text-[#1A3666] mb-1.5">添付ファイル</label>
        <input
          type="file"
          name="attachments"
          multiple
          accept="image/*,application/pdf"
          className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#1A3666] file:text-white hover:file:bg-[#2A52A0] file:cursor-pointer"
        />
        <p className="text-xs text-gray-400 mt-1">PDF・画像ファイルを添付できます（複数可）</p>
      </div>

      {state?.error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
          {state.error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 border border-gray-300 text-gray-600 font-semibold py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 bg-[#1A3666] text-white font-bold py-2.5 rounded-lg text-sm hover:bg-[#2A52A0] transition-colors disabled:opacity-60"
        >
          {pending ? '登録中...' : '登録する'}
        </button>
      </div>
    </form>
  )
}
