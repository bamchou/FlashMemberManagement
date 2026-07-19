'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { approveMember, rejectMember } from '../actions'

export default function ApprovalButtons({ id }: { id: string }) {
  const router = useRouter()
  const [isPendingApprove, startApprove] = useTransition()
  const [isPendingReject, startReject] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-2 mt-3">
      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">{error}</p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPendingApprove || isPendingReject}
          onClick={() => {
            setError(null)
            startApprove(async () => {
              try {
                await approveMember(id)
                router.push('/members')
              } catch (e) {
                setError('承認に失敗しました: ' + String(e))
              }
            })
          }}
          className="flex-1 py-1.5 text-xs font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {isPendingApprove ? '承認中...' : '承認'}
        </button>
        <button
          type="button"
          disabled={isPendingApprove || isPendingReject}
          onClick={() => {
            setError(null)
            startReject(async () => {
              try {
                await rejectMember(id)
                router.push('/members')
              } catch (e) {
                setError('承認取下げに失敗しました: ' + String(e))
              }
            })
          }}
          className="flex-1 py-1.5 text-xs font-bold bg-red-100 text-red-600 border border-red-300 rounded-lg hover:bg-red-200 disabled:opacity-50 transition-colors"
        >
          {isPendingReject ? '取下げ中...' : '承認取下げ'}
        </button>
      </div>
    </div>
  )
}
