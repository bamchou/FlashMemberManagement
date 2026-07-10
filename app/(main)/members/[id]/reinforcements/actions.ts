'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type ReinforcementFormState = { error: string } | undefined

export async function createReinforcement(
  memberId: string,
  _state: ReinforcementFormState,
  formData: FormData
): Promise<ReinforcementFormState> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラーが発生しました' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { error: '権限がありません' }

  const selectedDate = formData.get('selected_date') as string
  const notes = (formData.get('notes') as string).trim()

  if (!selectedDate) {
    return { error: '選出日は必須です' }
  }

  const { error } = await supabase.from('prefectural_reinforcements').insert({
    member_id: memberId,
    selected_date: selectedDate,
    notes: notes || null,
  })

  if (error) return { error: '県強化選手選出の登録に失敗しました' }

  revalidatePath(`/members/${memberId}`)
  redirect(`/members/${memberId}`)
}

export async function deleteReinforcement(reinforcementId: string, memberId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return

  await supabase.from('prefectural_reinforcements').delete().eq('id', reinforcementId)

  revalidatePath(`/members/${memberId}`)
  redirect(`/members/${memberId}`)
}
