'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type ResultFormState = { error: string } | undefined

export async function createTournamentResult(
  memberId: string,
  _state: ResultFormState,
  formData: FormData
): Promise<ResultFormState> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラーが発生しました' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { error: '権限がありません' }

  const tournamentName = (formData.get('tournament_name') as string).trim()
  const tournamentDate = formData.get('tournament_date') as string
  const eventType = formData.get('event_type') as string
  const result = (formData.get('result') as string).trim()
  const specialNote = formData.get('special_note') as string

  if (!tournamentName || !tournamentDate || !eventType) {
    return { error: '大会名・大会日付・種目は必須です' }
  }

  const { error } = await supabase.from('tournament_results').insert({
    member_id: memberId,
    tournament_name: tournamentName,
    tournament_date: tournamentDate,
    event_type: eventType,
    result: result || null,
    advanced_to_prefectural: specialNote === 'prefectural' || specialNote === 'kyushu',
    advanced_to_kyushu: specialNote === 'kyushu',
  })

  if (error) return { error: '戦績の登録に失敗しました' }

  revalidatePath(`/members/${memberId}`)
  redirect(`/members/${memberId}`)
}
