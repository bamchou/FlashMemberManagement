export function calculateGrade(birthDateStr: string): string {
  const birth = new Date(birthDateStr)
  const today = new Date()

  const currentSchoolYear =
    today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1

  const month = birth.getMonth() + 1
  const day = birth.getDate()
  const birthCohortYear =
    month > 4 || (month === 4 && day >= 2)
      ? birth.getFullYear() + 1
      : birth.getFullYear()

  const gradeNum = currentSchoolYear - birthCohortYear - 5

  if (gradeNum < 1) return '未就学'
  if (gradeNum <= 6) return `小学${gradeNum}年生`
  if (gradeNum <= 9) return `中学${gradeNum - 6}年生`
  if (gradeNum <= 12) return `高校${gradeNum - 9}年生`
  return '高校卒業'
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

export function formatYearMonth(dateStr: string): string {
  const [year, month] = dateStr.split('-')
  return `${year}年${parseInt(month, 10)}月`
}

export function calculateAge(birthDateStr: string): string {
  const birth = new Date(birthDateStr)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return `${age}歳`
}

export function calculateExperience(startDateStr: string): string {
  const start = new Date(startDateStr)
  const today = new Date()
  const totalMonths =
    (today.getFullYear() - start.getFullYear()) * 12 +
    (today.getMonth() - start.getMonth())

  if (totalMonths < 1) return '1ヶ月未満'
  if (totalMonths < 12) return `${totalMonths}ヶ月`
  const y = Math.floor(totalMonths / 12)
  const m = totalMonths % 12
  return m === 0 ? `${y}年` : `${y}年${m}ヶ月`
}
