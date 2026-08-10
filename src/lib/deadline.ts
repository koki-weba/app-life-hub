import { differenceInCalendarDays, format, parseISO } from 'date-fns'

export type DeadlineStatus = 'ok' | 'soon' | 'overdue' | 'none'

export function todayStr(d = new Date()) {
  return format(d, 'yyyy-MM-dd')
}

export function targetDeadlineInfo(targetDate: string | null | undefined, today = todayStr()) {
  if (!targetDate) {
    return {
      daysLeft: null as number | null,
      status: 'none' as DeadlineStatus,
      label: '期限未設定',
    }
  }
  const daysLeft = differenceInCalendarDays(parseISO(targetDate), parseISO(today))
  if (daysLeft < 0) {
    return {
      daysLeft,
      status: 'overdue' as DeadlineStatus,
      label: `${Math.abs(daysLeft)}日超過`,
    }
  }
  if (daysLeft === 0) {
    return { daysLeft, status: 'soon' as DeadlineStatus, label: '本日期限' }
  }
  if (daysLeft <= 14) {
    return { daysLeft, status: 'soon' as DeadlineStatus, label: `あと${daysLeft}日` }
  }
  return { daysLeft, status: 'ok' as DeadlineStatus, label: `あと${daysLeft}日` }
}

export function formatTargetDate(date: string | null | undefined) {
  if (!date) return '—'
  try {
    return format(parseISO(date), 'M/d')
  } catch {
    return date
  }
}

/**
 * 開始日〜期限日の進捗 0〜1。
 * 開始日が無い場合は期限までの残日数を 90 日基準で近似。
 */
export function deadlineApproachRatio(
  startDate: string | null | undefined,
  targetDate: string | null | undefined,
  today = todayStr(),
): number {
  if (!targetDate) return 0

  const daysLeft = differenceInCalendarDays(parseISO(targetDate), parseISO(today))
  if (daysLeft <= 0) return 1

  if (startDate) {
    const total = differenceInCalendarDays(parseISO(targetDate), parseISO(startDate))
    if (total <= 0) return 1
    const elapsed = differenceInCalendarDays(parseISO(today), parseISO(startDate))
    if (elapsed <= 0) return 0
    return Math.round(Math.min(1, Math.max(0, elapsed / total)) * 1000) / 1000
  }

  const horizon = 90
  if (daysLeft >= horizon) return 0
  return Math.round((1 - daysLeft / horizon) * 1000) / 1000
}

export function normalizeDateStr(value: unknown): string | null {
  if (value == null) return null
  const s = String(value).trim().slice(0, 10)
  return s || null
}
