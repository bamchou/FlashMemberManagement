'use client'

import { useState, useTransition } from 'react'
import { createComment, updateComment, deleteComment, toggleCommentVisibility } from '../comments/actions'
import type { AnnouncementComment, Role } from '@/lib/types'

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function CommentItem({
  comment,
  announcementId,
  currentUserId,
  isAdmin,
}: {
  comment: AnnouncementComment
  announcementId: string
  currentUserId: string
  isAdmin: boolean
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)
  const [isPending, startTransition] = useTransition()
  const isOwner = comment.user_id === currentUserId
  const authorName = comment.profiles?.display_name ?? comment.profiles?.username ?? '不明'

  function handleUpdate() {
    startTransition(async () => {
      await updateComment(comment.id, announcementId, editContent)
      setIsEditing(false)
    })
  }

  function handleDelete() {
    if (!confirm('このコメントを削除しますか？')) return
    startTransition(() => deleteComment(comment.id, announcementId))
  }

  function handleToggleVisibility() {
    startTransition(() => toggleCommentVisibility(comment.id, announcementId, !comment.is_visible))
  }

  return (
    <div className={`rounded-lg border-2 p-4 ${!comment.is_visible ? 'opacity-50 border-gray-200 bg-gray-50' : isOwner ? 'border-[#1A3666] bg-white' : 'border-[#EAE0A8] bg-white'}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-[#1A3666]">{authorName}</span>
          {!comment.is_visible && isAdmin && (
            <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">非表示</span>
          )}
          <span className="text-xs text-gray-400">{formatDateTime(comment.created_at)}</span>
          {comment.updated_at !== comment.created_at && (
            <span className="text-xs text-gray-400">（編集済）</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isAdmin && (
            <button
              onClick={handleToggleVisibility}
              disabled={isPending}
              className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-colors disabled:opacity-50 ${
                comment.is_visible
                  ? 'bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600'
                  : 'bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-700'
              }`}
            >
              {comment.is_visible ? '非表示' : '表示'}
            </button>
          )}
          {isOwner && !isEditing && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs text-[#1A3666] hover:underline"
              >
                編集
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50"
              >
                削除
              </button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={3}
            lang="ja"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setIsEditing(false); setEditContent(comment.content) }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              キャンセル
            </button>
            <button
              onClick={handleUpdate}
              disabled={isPending || !editContent.trim()}
              className="text-sm font-semibold text-white bg-[#1A3666] px-3 py-1 rounded-lg hover:bg-[#2A52A0] disabled:opacity-50 transition-colors"
            >
              {isPending ? '更新中...' : '更新'}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{comment.content}</p>
      )}
    </div>
  )
}

function CommentForm({ announcementId }: { announcementId: string }) {
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await createComment(announcementId, content)
      if (result.error) {
        setError(result.error)
      } else {
        setContent('')
        setError(null)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        value={content}
        onChange={(e) => { setContent(e.target.value); setError(null) }}
        rows={3}
        placeholder="コメントを入力..."
        lang="ja"
        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent resize-none"
      />
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending || !content.trim()}
          className="text-sm font-semibold text-white bg-[#1A3666] px-4 py-2 rounded-lg hover:bg-[#2A52A0] disabled:opacity-50 transition-colors"
        >
          {isPending ? '投稿中...' : 'コメントする'}
        </button>
      </div>
    </form>
  )
}

export default function CommentSection({
  announcementId,
  comments,
  currentUserId,
  role,
}: {
  announcementId: string
  comments: AnnouncementComment[]
  currentUserId: string
  role: Role
}) {
  const isAdmin = role === 'admin'

  return (
    <div className="bg-white rounded-xl border border-[#EAE0A8] p-6">
      <h2 className="text-base font-bold text-[#1A3666] mb-4">
        コメント {comments.length > 0 && <span className="text-sm font-normal text-gray-400">（{comments.length}件）</span>}
      </h2>

      <div className="pb-4 mb-4 border-b border-[#EAE0A8]">
        <CommentForm announcementId={announcementId} />
      </div>

      <div className="space-y-3">
        {comments.length > 0 ? (
          comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              announcementId={announcementId}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
            />
          ))
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">まだコメントはありません</p>
        )}
      </div>
    </div>
  )
}
