'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { closedMonthError, jstYearMonth } from '@/lib/accounting/closing'
import { EXPENSE_CATEGORIES } from '@/lib/accounting/constants'

export type ExpenseFormState = { error?: string; ok?: boolean; savedAt?: number } | undefined

type LineInput = { category: string; amount: string; memo: string }

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, error: '認証エラー' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { user: null, error: '権限がありません' }
  return { user, error: null }
}

/** 1枚の領収書（任意）に対して、複数の明細（種類・金額・メモ）を登録する */
export async function createExpense(_state: ExpenseFormState, formData: FormData): Promise<ExpenseFormState> {
  const { user, error: authError } = await requireAdmin()
  if (!user) return { error: authError! }

  const expenseDate = (formData.get('expense_date') as string)?.trim()
  const file = formData.get('receipt')
  if (!expenseDate || !/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) return { error: '日付を入力してください' }

  // 明細（金額もメモも空の行は無視）
  let rawLines: LineInput[] = []
  try {
    rawLines = JSON.parse((formData.get('lines') as string) || '[]')
  } catch {
    return { error: '明細の読み取りに失敗しました' }
  }
  const used = rawLines
    .map((l, i) => ({ no: i + 1, category: String(l.category ?? '').trim(), amount: String(l.amount ?? '').trim(), memo: String(l.memo ?? '').trim() }))
    .filter(l => l.amount !== '' || l.memo !== '')
  if (used.length === 0) return { error: '明細を1行以上入力してください' }

  const lines: { category: string; amount: number; memo: string | null }[] = []
  for (const l of used) {
    if (!(EXPENSE_CATEGORIES as readonly string[]).includes(l.category)) return { error: `${l.no}行目：種類を選択してください` }
    const amount = parseInt(l.amount, 10)
    if (l.amount === '' || isNaN(amount) || amount < 0) return { error: `${l.no}行目：金額を正しく入力してください` }
    lines.push({ category: l.category, amount, memo: l.memo || null })
  }

  const { year, month } = jstYearMonth(expenseDate)
  const lockError = await closedMonthError(year, month)
  if (lockError) return { error: lockError }

  const admin = createAdminClient()

  // 領収書（任意・1ファイル）。明細すべてで共有する
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

  const receipt_group_id = randomUUID()
  const { error } = await admin.from('expenses').insert(
    lines.map(l => ({
      expense_date: expenseDate,
      category: l.category,
      amount: l.amount,
      memo: l.memo,
      receipt_path,
      receipt_url,
      receipt_name,
      receipt_group_id,
      created_by: user.id,
    }))
  )
  if (error) {
    if (receipt_path) await admin.storage.from('attachments').remove([receipt_path])
    return { error: '経費の登録に失敗しました' }
  }

  revalidatePath('/accounting/expenses')
  revalidatePath('/accounting/closing')
  return { ok: true, savedAt: Date.now() }
}

/** 明細を1行削除する。同じ領収書の明細が他に残っていなければ領収書ファイルも削除 */
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

  if (row.receipt_path) {
    const { count } = await admin
      .from('expenses')
      .select('id', { count: 'exact', head: true })
      .eq('receipt_path', row.receipt_path)
    if (!count) await admin.storage.from('attachments').remove([row.receipt_path])
  }

  revalidatePath('/accounting/expenses')
  revalidatePath('/accounting/closing')
  return {}
}
