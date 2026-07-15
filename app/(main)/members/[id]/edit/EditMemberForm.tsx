'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateMember, type MemberFormState } from '../../actions'
import type { Member } from '@/lib/types'

function Field({
  label,
  name,
  type = 'text',
  required = false,
  defaultValue,
  max,
  placeholder,
  lang,
}: {
  label: string
  name: string
  type?: string
  required?: boolean
  defaultValue?: string
  max?: string
  placeholder?: string
  lang?: string
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-semibold text-[#1A3666] mb-1.5">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        max={max}
        placeholder={placeholder}
        lang={lang}
        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent transition-shadow bg-white"
      />
    </div>
  )
}

export default function EditMemberForm({ member, isAdmin }: { member: Member; isAdmin: boolean }) {
  const boundUpdate = updateMember.bind(null, member.id)
  const [state, action, pending] = useActionState<MemberFormState, FormData>(
    boundUpdate,
    undefined
  )
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]
  const thisMonth = today.slice(0, 7)
  const [preview, setPreview] = useState<string | null>(null)

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setPreview(URL.createObjectURL(file))
    else setPreview(null)
  }

  const photoSrc = preview ?? member.photo_url

  return (
    <form action={action} className="space-y-5">
      {/* 写真 */}
      <div>
        <p className="block text-sm font-semibold text-[#1A3666] mb-1.5">写真</p>
        <div className="flex items-center gap-4">
          <div className="w-16 h-24 rounded-xl bg-[#F5C800]/20 border-2 border-[#F5C800] flex items-center justify-center overflow-hidden shrink-0">
            {photoSrc
              ? <img src={photoSrc} alt={member.full_name} className="w-full h-full object-cover object-top" />
              : <span className="text-3xl">👤</span>
            }
          </div>
          <label className="cursor-pointer text-sm font-semibold text-[#1A3666] border border-[#1A3666] px-4 py-2 rounded-lg hover:bg-[#1A3666] hover:text-white transition-colors">
            {member.photo_url ? '写真を変更' : 'ファイルを選択'}
            <input
              type="file"
              name="photo"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </label>
        </div>
      </div>

      <Field
        label="氏名" name="full_name" required
        defaultValue={member.full_name} lang="ja"
      />
      <Field
        label="氏名（読み仮名）" name="full_name_kana"
        defaultValue={member.full_name_kana ?? ''} placeholder="例: ヤマダ タロウ"
      />

      {/* 性別 */}
      <div>
        <p className="block text-sm font-semibold text-[#1A3666] mb-1.5">性別</p>
        <div className="flex gap-6">
          {(['男', '女'] as const).map((g) => (
            <label key={g} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="gender"
                value={g}
                defaultChecked={member.gender === g}
                className="w-4 h-4 border-gray-300 text-[#1A3666] focus:ring-[#1A3666]"
              />
              <span className="text-sm text-gray-700">{g}</span>
            </label>
          ))}
        </div>
      </div>

      <Field
        label="生年月日" name="birth_date" type="date" required
        defaultValue={member.birth_date} max={today}
      />
      <Field
        label="加入年月" name="join_date" type="month" required
        defaultValue={member.join_date.slice(0, 7)} max={thisMonth}
      />
      <Field
        label="バドミントン開始年月" name="badminton_start_date" type="month"
        defaultValue={member.badminton_start_date?.slice(0, 7) ?? ''} max={thisMonth}
      />

      {isAdmin && (
        <div>
          <label htmlFor="registration_number" className="block text-sm font-semibold text-[#1A3666] mb-1.5">
            協会登録番号
          </label>
          <input
            id="registration_number"
            name="registration_number"
            type="text"
            inputMode="numeric"
            maxLength={10}
            defaultValue={member.registration_number ?? ''}
            placeholder="数字10桁"
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent transition-shadow bg-white"
          />
          <p className="text-xs text-gray-400 mt-1">数字10桁で入力してください</p>
        </div>
      )}

      {/* 練習頻度 */}
      <div>
        <label htmlFor="practice_frequency" className="block text-sm font-semibold text-[#1A3666] mb-1.5">
          練習頻度
        </label>
        <select
          id="practice_frequency" name="practice_frequency"
          defaultValue={member.practice_frequency ?? ''}
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white"
        >
          <option value="">選択してください</option>
          {[1, 2, 3, 4, 5].map(n => (
            <option key={n} value={n}>週{n}回</option>
          ))}
        </select>
      </div>

      {/* 参加曜日 */}
      <div>
        <p className="block text-sm font-semibold text-[#1A3666] mb-1.5">主な参加曜日</p>
        <div className="flex gap-4 flex-wrap">
          {['月', '火', '水', '木', '金', '土', '日'].map(day => (
            <label key={day} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox" name="practice_days" value={day}
                defaultChecked={member.practice_days?.includes(day) ?? false}
                className="w-4 h-4 rounded border-gray-300 text-[#1A3666] focus:ring-[#1A3666]"
              />
              <span className="text-sm text-gray-700">{day}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="play_style" className="block text-sm font-semibold text-[#1A3666] mb-1.5">
          プレイスタイル・強み
        </label>
        <textarea
          id="play_style"
          name="play_style"
          rows={3}
          defaultValue={member.play_style ?? ''}
          placeholder="例: 前衛が得意で、ネット際のコントロールに強み"
          lang="ja"
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent transition-shadow bg-white resize-none"
        />
      </div>

      {/* 表示/非表示（管理者のみ） */}
      {isAdmin && (
        <div className="flex items-center gap-3 bg-[#FFFDF0] border border-[#EAE0A8] rounded-lg px-4 py-3">
          <input
            id="is_visible"
            name="is_visible"
            type="checkbox"
            defaultChecked={member.is_visible}
            className="w-4 h-4 rounded border-gray-300 text-[#1A3666] focus:ring-[#1A3666] cursor-pointer"
          />
          <label htmlFor="is_visible" className="text-sm font-semibold text-[#1A3666] cursor-pointer">
            メンバー一覧に表示する
          </label>
        </div>
      )}

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

    </form>
  )
}
