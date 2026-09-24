'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { closedMonthError, jstYearMonth } from '@/lib/accounting/closing'
import { EXPENSE_CATEGORIES } from '@/lib/accounting/constants'

export type ExpenseFormState = { error?: string; ok?: boolean } | undefined

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, error: '認証エラー' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { user: null, error: '権限がありません' }
  return { user, error: null }
}

export async function createExpense(_state: ExpenseFormState, formData: FormData): Promise<ExpenseFormState> {
  const { user, error: authError } = await requireAdmin()
  if (!user) return { error: authError! }

  const expenseDate = (formData.get('expense_date') as string)?.trim()
  const category = (formData.get('category') as string)?.trim()
  const amountRaw = (formData.get('amount') as string)?.trim()
  const memo = (formData.get('memo') as string)?.trim() || null
  const file = formData.get('receipt')

  if (!expenseDate || !/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) return { error: '日付を入力してください' }
  if (!category || !(EXPENSE_CATEGORIES as readonly string[]).includes(category)) return { error: '種類を選択してください' }
  const amount = parseInt(amountRaw ?? '', 10)
  if (isNaN(amount) || amount < 0) return { error: '金額を正しく入力してください' }

  const { year, month } = jstYearMonth(expenseDate)
  const lockError = await closedMonthError(year, month)
  if (lockError) return { error: lockError }

  const admin = createAdminClient()

  // 領収書（任意・1ファイル）
  let receipt_path: string | null = null
  let receipt_url: string | null = null
  let receipt_name: string | null = null
  if (file && typeof file !== 'string' && file.size > 0) {
    const name = file.name || 'receipt'
    const ext = name.split('.').pop()?.toLowerCase() ?? 'bin'
    const path = `expenses/${expenseDate}/${Date.now()}.${ext}`
    const { error: upErr } = await admin.storage
      .from('attachments')
      .upload(path, await file.arrayBuffer(), { contentType: file.type || 'application/octet-stream' })
    if (upErr) return { error: `領収書のアップロードに失敗しました: ${upErr.message}` }
    receipt_path = path
    receipt_url = admin.storage.from('attachments').getPublicUrl(path).data.publicUrl
    receipt_name = name
  }

  const { error } = await admin.from('expenses').insert({
    expense_date: expenseDate,
    category,
    amount,
    memo,
    receipt_path,
    receipt_url,
    receipt_name,
    created_by: user.id,
  })
  if (error) {
    if (receipt_path) await admin.storage.from('attachments').remove([receipt_path])
    return { error: '経費の登録に失敗しました' }
  }

  revalidatePath('/accounting/expenses')
  revalidatePath('/accounting/closing')
  return { ok: true }
}

export async function deleteExpense(id: string): Promise<{ error?: string }> {
  const { user, error: authError } = await requireAdmin()
  if (!user) return { error: authError! }

  const admin = createAdminClient()
  const { data: row } = await admin.from('expenses').select('expense_date, receipt_path').eq('id', id).single()
  if (!row) return { error: '経費が見つかりません' }

  const { year, month } = jstYearMonth(row.expense_date)
  const lockError = await closedMonthError(year, month)
  if (lockError) return { error: lockError }

  const { error } = await admin.from('expenses').delete().eq('id', id)
  if (error) return { error: '削除に失敗しました' }
  if (row.receipt_path) await admin.storage.from('attachments').remove([row.receipt_path])

  revalidatePath('/accounting/expenses')
  revalidatePath('/accounting/closing')
  return {}
}
