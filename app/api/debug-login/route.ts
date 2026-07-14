import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    return NextResponse.json({ error: 'env vars missing', url: !!url, anonKey: !!anonKey })
  }

  const supabase = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // get_email_by_username の動作確認
  const { data: email, error: rpcError } = await supabase
    .rpc('get_email_by_username', { p_username: 'katayama' })

  // signInWithPassword の動作確認
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: 'katayama@flash.internal',
    password: '123456',
  })

  return NextResponse.json({
    supabaseUrl: url.slice(0, 40) + '...',
    rpcResult: email,
    rpcError: rpcError?.message ?? null,
    signInError: signInError?.message ?? null,
    signInSuccess: !signInError,
  })
}
