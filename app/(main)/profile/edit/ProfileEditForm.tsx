'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateMyProfile } from './actions'
import { toSupabaseImageUrl } from '@/lib/utils/imageUrl'

type Props = {
  initialDisplayName: string
  initialDisplayNameKana: string | null
  initialPhotoUrl: string | null
  initialQualifications: string | null
  initialBirthDate: string
  initialBadmintonStartDate: string
}

export default function ProfileEditForm({
  initialDisplayName,
  initialDisplayNameKana,
  initialPhotoUrl,
  initialQualifications,
  initialBirthDate,
  initialBadmintonStartDate,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const photoSrc = preview ?? toSupabaseImageUrl(initialPhotoUrl, 300, 80)
  const today = new Date().toISOString().split('T')[0]
  const thisMonth = today.slice(0, 7)

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setPreview(file ? URL.createObjectURL(file) : null)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateMyProfile(undefined, formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 写真 */}
      <div>
        <label className="block text-sm font-semibold text-[#1A3666] mb-2">写真</label>
        <div className="flex items-center gap-4">
          <div className="w-16 h-24 rounded-xl bg-[#F5C800]/20 border-2 border-[#F5C800] flex items-center justify-center overflow-hidden shrink-0">
            {photoSrc
              ? <img src={photoSrc} alt="プロフィール写真" className="w-full h-full object-cover object-top" />
              : <span className="text-3xl">👤</span>}
          </div>
          <label className="cursor-pointer text-sm font-semibold text-[#1A3666] border border-[#1A3666] px-4 py-2 rounded-lg hover:bg-[#1A3666] hover:text-white transition-colors">
            {initialPhotoUrl ? '写真を変更' : 'ファイルを選択'}
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

      {/* 表示名 */}
      <div>
        <label htmlFor="display_name" className="block text-sm font-semibold text-[#1A3666] mb-1.5">
          表示名
        </label>
        <input
          id="display_name" name="display_name" type="text"
          defaultValue={initialDisplayName}
          placeholder="例: 山田 太郎"
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white"
        />
      </div>

      {/* 表示名（ヨミガナ） */}
      <div>
        <label htmlFor="display_name_kana" className="block text-sm font-semibold text-[#1A3666] mb-1.5">
          表示名（ヨミガナ）
        </label>
        <input
          id="display_name_kana" name="display_name_kana" type="text"
          defaultValue={initialDisplayNameKana ?? ''}
          placeholder="例: ヤマダ タロウ"
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white"
        />
      </div>

      {/* 資格・免許 */}
      <div>
        <label htmlFor="qualifications" className="block text-sm font-semibold text-[#1A3666] mb-1.5">
          資格・免許
        </label>
        <textarea
          id="qualifications" name="qualifications"
          defaultValue={initialQualifications ?? ''}
          rows={3}
          placeholder="例: 審判資格B級、指導員資格"
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white resize-none"
        />
      </div>

      {/* 生年月日 */}
      <div>
        <label htmlFor="birth_date" className="block text-sm font-semibold text-[#1A3666] mb-1.5">
          生年月日
        </label>
        <input
          id="birth_date" name="birth_date" type="date"
          defaultValue={initialBirthDate}
          max={today}
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white"
        />
      </div>

      {/* バドミントン開始年月 */}
      <div>
        <label htmlFor="badminton_start_date" className="block text-sm font-semibold text-[#1A3666] mb-1.5">
          バドミントン開始年月
        </label>
        <input
          id="badminton_start_date" name="badminton_start_date" type="month"
          defaultValue={initialBadmintonStartDate}
          max={thisMonth}
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white"
        />
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">{error}</p>
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
          disabled={isPending}
          className="flex-1 bg-[#1A3666] text-white font-bold py-2.5 rounded-lg text-sm hover:bg-[#2A52A0] transition-colors disabled:opacity-60"
        >
          {isPending ? '保存中...' : '保存する'}
        </button>
      </div>
    </form>
  )
}
