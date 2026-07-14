'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { approveMember, rejectMember } from '../actions'

export default function ApprovalButtons({ id }: { id: string }) {
  const router = useRouter()
  const [isPendingApprove, startApprove] = useTransition()
  const [isPendingReject, startReject] = useTransition()

  return (
    <div className="flex gap-2 mt-3">
      <button
        type="button"
        disabled={isPendingApprove || isPendingReject}
        onClick={() => startApprove(async () => {
          await approveMember(id)
          router.push('/members')
        })}
        className="flex-1 py-1.5 text-xs font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
      >
        {isPendingApprove ? '承認中...' : '承認'}
      </button>
      <button
        type="button"
        disabled={isPendingApprove || isPendingReject}
        onClick={() => startReject(async () => {
          await rejectMember(id)
          router.push('/members')
        })}
        className="flex-1 py-1.5 text-xs font-bold bg-red-100 text-red-600 border border-red-300 rounded-lg hover:bg-red-200 disabled:opacity-50 transition-colors"
      >
        {isPendingReject ? '削除中...' : '却下・削除'}
      </button>
    </div>
  )
}
