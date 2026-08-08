import type { AppData, BodyData, BusinessData } from '../types'

export type LegacyKind = 'business' | 'body' | 'lifehub' | 'unknown'

export function detectLegacyKind(parsed: Record<string, unknown>): LegacyKind {
  if (parsed.version === 1 || parsed.version === 2) {
    if (parsed.spaces || parsed.business || parsed.body) return 'lifehub'
  }
  if (parsed.salesLogs || parsed.snsLogs || parsed.clients || parsed.igList) {
    return 'business'
  }
  if (parsed.records || parsed.exercises || parsed.workouts) {
    return 'body'
  }
  if (parsed.settings && typeof parsed.settings === 'object') {
    const s = parsed.settings as Record<string, unknown>
    if ('dailyCalGoal' in s || 'targetWeight' in s || 'startWeight' in s) return 'body'
  }
  return 'unknown'
}

export function summarizeBusiness(b: BusinessData) {
  return {
    dmDays: b.salesLogs?.length ?? 0,
    snsWeeks: b.snsLogs?.length ?? 0,
    clients: b.clients?.length ?? 0,
    ig: b.igList?.length ?? 0,
  }
}

export function summarizeBody(body: BodyData) {
  const records = Object.values(body.records ?? {})
  return {
    weightDays: records.filter((r) => r.weight != null).length,
    calorieDays: records.filter((r) => r.dailyCalories != null).length,
    exercises: body.exercises?.length ?? 0,
    workouts: body.workouts?.length ?? 0,
  }
}

export function migrationChecklist(data: Pick<AppData, 'business' | 'body'>) {
  const biz = summarizeBusiness(data.business)
  const body = summarizeBody(data.body)
  return {
    businessReady: biz.dmDays > 0 || biz.clients > 0 || biz.ig > 0 || biz.snsWeeks > 0,
    bodyReady: body.weightDays > 0 || body.workouts > 0 || body.calorieDays > 0,
    biz,
    body,
  }
}
