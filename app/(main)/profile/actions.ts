'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const GYM_ACCOUNT_MAX = 10

/** 自分が保持している体育館予約アカウントの数を保存する */
export async function updateMyGymAccountCount(count: number): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラー' }
  if (!Number.isInteger(count) || count < 0 || count > GYM_ACCOUNT_MAX) {
    return { error: `0〜${GYM_ACCOUNT_MAX}の範囲で入力してください` }
  }

  const admin = createAdminClient()
  const { error } = await admin.from('profiles').update({ gym_account_count: count }).eq('id', user.id)
  if (error) return { error: '保存に失敗しました' }

  revalidatePath('/profile')
  revalidatePath('/shift/gym-assignments')
  return {}
}
