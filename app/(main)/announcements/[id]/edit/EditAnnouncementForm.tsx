'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { updateAnnouncement, deleteAnnouncement, type AnnouncementFormState } from '../../actions'
import type { Announcement, Attachment } from '@/lib/types'
import AttachmentList from '@/app/(main)/_components/AttachmentList'

export default function EditAnnouncementForm({
  announcement,
  attachments,
}: {
  announcement: Announcement
  attachments: Attachment[]
}) {
  const boundUpdate = updateAnnouncement.bind(null, announcement.id)
  const [state, action, pending] = useActionState<AnnouncementFormState, FormData>(
    boundUpdate,
    undefined
  )
  const router = useRouter()

  async function handleDelete() {
    if (!confirm('この連絡事項を削除しますか？\nこの操作は元に戻せません。')) return
    await deleteAnnouncement(announcement.id)
  }

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
          defaultValue={announcement.title}
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
          defaultValue={announcement.content}
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
          defaultValue={announcement.target}
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
              defaultValue={announcement.publish_start ?? ''}
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
              defaultValue={announcement.publish_end ?? ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white"
            />
          </div>
        </div>
      </div>

      {/* 添付ファイル */}
      <div>
        <label className="block text-sm font-semibold text-[#1A3666] mb-2">添付ファイル</label>
        {attachments.length > 0 && (
          <div className="mb-2">
            <AttachmentList
              attachments={attachments}
              canDelete={true}
              entityType="announcement"
              entityId={announcement.id}
            />
          </div>
        )}
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
          {pending ? '更新中...' : '更新する'}
        </button>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={handleDelete}
          className="w-full text-sm text-red-500 hover:text-red-700 py-2 transition-colors"
        >
          この連絡事項を削除する
        </button>
      </div>
    </form>
  )
}
