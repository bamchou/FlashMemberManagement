'use client'

import { useState, useTransition } from 'react'
import { withdrawGuardian, reenrollGuardian } from '../../actions'

type MemberInfo = { id: string; name: string; withdrawnAt: string | null }
type Guardian = {
  id: string
  username: string
  displayName: string | null
  pendingReenrollment: boolean
  members: MemberInfo[]
}

function GuardianRow({
  guardian,
  action,
  isProcessing,
  showWithdrawnMembers = false,
}: {
  guardian: Guardian
  action: React.ReactNode
  isProcessing: boolean
  showWithdrawnMembers?: boolean
}) {
  const activeMembers = guardian.members.filter(m => !m.withdrawnAt)
  const withdrawnMembers = guardian.members.filter(m => m.withdrawnAt)
  const displayMembers = showWithdrawnMembers ? withdrawnMembers : activeMembers

  return (
    <div className={`bg-white rounded-xl border px-4 py-3 flex items-center gap-3 ${showWithdrawnMembers ? 'border-gray-200' : 'border-[#EAE0A8]'}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold text-[#1A3666] truncate">{guardian.displayName ?? guardian.username}</p>
          <span className="text-xs text-gray-400 shrink-0">{guardian.username}</span>
          {guardian.pendingReenrollment && (
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-300 px-1.5 py-0.5 rounded-full shrink-0">再入会処理中</span>
          )}
        </div>
        {displayMembers.length > 0 ? (
          <p className="text-xs text-gray-500 mt-0.5">
            {showWithdrawnMembers ? '退会済みのお子様: ' : 'お子様: '}
            {displayMembers.map(m => m.name).join('、')}
          </p>
        ) : !showWithdrawnMembers ? (
          <p className="text-xs text-gray-400 mt-0.5">在籍中のお子様なし</p>
        ) : null}
      </div>
      {isProcessing ? (
        <span className="text-xs text-gray-400 shrink-0">処理中...</span>
      ) : action}
    </div>
  )
}

export default function GuardianListClient({
  active,
  withdrawn,
}: {
  active: Guardian[]
  withdrawn: Guardian[]
}) {
  const [tab, setTab] = useState<'active' | 'withdrawn'>('active')
  const [nameFilter, setNameFilter] = useState('')
  const [newPassword, setNewPassword] = useState<{ guardianName: string; value: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filteredWithdrawn = withdrawn.filter(g => {
    if (!nameFilter) return true
    const name = (g.displayName ?? g.username).toLowerCase()
    return name.includes(nameFilter.toLowerCase()) || g.username.toLowerCase().includes(nameFilter.toLowerCase())
  })

  function handleWithdraw(guardian: Guardian) {
    const activeNames = guardian.members.filter(m => !m.withdrawnAt).map(m => m.name).join('、')
    const msg = activeNames
      ? `${guardian.displayName ?? guardian.username} を退会処理します。\nお子様（${activeNames}）も同時に退会扱いとなりますがよろしいですか？`
      : `${guardian.displayName ?? guardian.username} を退会処理します。よろしいですか？`
    if (!confirm(msg)) return
    setProcessingId(guardian.id)
    setError(null)
    startTransition(async () => {
      const result = await withdrawGuardian(guardian.id)
      setProcessingId(null)
      if (result?.error) setError(result.error)
    })
  }

  function handleReenroll(guardian: Guardian) {
    if (!confirm(`${guardian.displayName ?? guardian.username} の再入会処理を行います。\n新しい仮パスワードが発行されます。よろしいですか？`)) return
    setProcessingId(guardian.id)
    setError(null)
    startTransition(async () => {
      const result = await reenrollGuardian(guardian.id)
      setProcessingId(null)
      if ('error' in result) {
        setError(result.error)
      } else {
        setNewPassword({ guardianName: guardian.displayName ?? guardian.username, value: result.password })
        setCopied(false)
      }
    })
  }

  function handleCopy() {
    if (!newPassword) return
    navigator.clipboard.writeText(newPassword.value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="space-y-4">
      {/* タブ */}
      <div className="flex border-b border-[#EAE0A8]">
        <button
          type="button"
          onClick={() => setTab('active')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            tab === 'active' ? 'border-[#1A3666] text-[#1A3666]' : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          在籍中
          <span className="ml-1.5 text-xs bg-[#1A3666]/10 text-[#1A3666] px-1.5 py-0.5 rounded-full">{active.length}</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('withdrawn')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            tab === 'withdrawn' ? 'border-[#1A3666] text-[#1A3666]' : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          退会済み
          <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{withdrawn.length}</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* 仮パスワード表示 */}
      {newPassword && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-green-800">{newPassword.guardianName} の再入会処理が完了しました</p>
          <p className="text-xs text-green-700">以下の仮パスワードを保護者にお伝えください。ログイン後にお子様の復活選択画面が表示されます。</p>
          <div className="flex items-center gap-2">
            <p className="flex-1 font-mono text-sm bg-white border border-green-300 rounded-lg px-3 py-2.5 tracking-widest select-all">
              {newPassword.value}
            </p>
            <button
              type="button"
              onClick={handleCopy}
              className={`shrink-0 text-sm font-semibold px-3 py-2.5 rounded-lg transition-colors ${
                copied ? 'bg-green-100 text-green-700' : 'bg-green-700 text-white hover:bg-green-800'
              }`}
            >
              {copied ? 'コピー済' : 'コピー'}
            </button>
          </div>
          <button type="button" onClick={() => setNewPassword(null)} className="text-xs text-green-600 hover:underline">閉じる</button>
        </div>
      )}

      {/* 在籍中タブ */}
      {tab === 'active' && (
        <div className="space-y-3">
          {active.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#EAE0A8] p-8 text-center text-gray-400 text-sm">在籍中の保護者がいません</div>
          ) : (
            active.map(g => (
              <GuardianRow
                key={g.id}
                guardian={g}
                isProcessing={processingId === g.id && isPending}
                action={
                  <button
                    type="button"
                    onClick={() => handleWithdraw(g)}
                    disabled={isPending}
                    className="shrink-0 text-xs font-semibold text-red-600 border border-red-300 px-3 py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    退会処理
                  </button>
                }
              />
            ))
          )}
        </div>
      )}

      {/* 退会済みタブ */}
      {tab === 'withdrawn' && (
        <div className="space-y-4">
          <input
            type="text"
            value={nameFilter}
            onChange={e => setNameFilter(e.target.value)}
            placeholder="名前で絞り込み"
            className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white"
          />
          {filteredWithdrawn.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#EAE0A8] p-8 text-center text-gray-400 text-sm">
              {nameFilter ? '該当する保護者がいません' : '退会済みの保護者がいません'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredWithdrawn.map(g => (
                <GuardianRow
                  key={g.id}
                  guardian={g}
                  isProcessing={processingId === g.id && isPending}
                  showWithdrawnMembers
                  action={
                    <button
                      type="button"
                      onClick={() => handleReenroll(g)}
                      disabled={isPending}
                      className="shrink-0 text-xs font-semibold text-[#1A3666] border border-[#1A3666] px-3 py-1.5 rounded-lg hover:bg-[#1A3666] hover:text-white disabled:opacity-50 transition-colors"
                    >
                      再入会処理
                    </button>
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
