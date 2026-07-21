import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileEditForm from './ProfileEditForm'

export default async function ProfileEditPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, display_name, display_name_kana, photo_url, qualifications, birth_date, badminton_start_date')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  if (profile.role !== 'coach') redirect('/profile')

  const badmintonStartDate = profile.badminton_start_date
    ? (profile.badminton_start_date as string).slice(0, 7)
    : ''

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#1A3666]">プロフィール編集</h1>
      </div>

      <div className="bg-white rounded-xl border border-[#EAE0A8] p-6">
        <ProfileEditForm
          initialDisplayName={profile.display_name ?? ''}
          initialDisplayNameKana={profile.display_name_kana ?? null}
          initialPhotoUrl={profile.photo_url ?? null}
          initialQualifications={profile.qualifications ?? null}
          initialBirthDate={profile.birth_date ?? ''}
          initialBadmintonStartDate={badmintonStartDate}
        />
      </div>
    </div>
  )
}
