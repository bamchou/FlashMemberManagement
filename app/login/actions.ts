'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type LoginState = { error: string } | undefined

export async function login(_state: LoginState, formData: FormData): Promise<LoginState> {
  const username = formData.get('username') as string
  const password = formData.get('password') as string

  if (!username || !password) {
    return { error: 'ユーザーIDとパスワードを入力してください' }
  }

  const supabase = await createClient()

  // username → email を取得（未ログイン状態で呼び出し可能な RPC）
  const { data: email, error: rpcError } = await supabase
    .rpc('get_email_by_username', { p_username: username })

  if (rpcError || !email) {
    return { error: 'ユーザーIDまたはパスワードが正しくありません' }
  }

  // 取得した email + password でサインイン
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'ユーザーIDまたはパスワードが正しくありません' }
  }

  redirect('/members')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
