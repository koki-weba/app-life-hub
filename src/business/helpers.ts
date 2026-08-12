import { format, startOfWeek, addDays, parseISO, isWithinInterval } from 'date-fns'
import type { AppData, BusinessData, Client, DmLog, IgEntry, SnsWeekLog } from '../types'
import { uid } from '../lib/id'

export function emptyBusiness(): BusinessData {
  return {
    dmDailyGoal: 20,
    dmWeeklyGoal: 140,
    salesLogs: [],
    snsLogs: [],
    clients: [],
    igList: [],
  }
}

export function todayStr(d = new Date()) {
  return format(d, 'yyyy-MM-dd')
}

/** 週の起点（日曜） */
export function sundayOf(dateStr: string) {
  const d = parseISO(dateStr)
  return format(startOfWeek(d, { weekStartsOn: 0 }), 'yyyy-MM-dd')
}

export function weekRangeLabel(weekStart: string) {
  const end = format(addDays(parseISO(weekStart), 6), 'MM/dd')
  const start = format(parseISO(weekStart), 'MM/dd')
  return `${start}〜${end}`
}

export function dmCountOn(logs: DmLog[], date: string) {
  return logs.find((l) => l.date === date)?.count ?? 0
}

export function dmCountThisWeek(logs: DmLog[], anchor = new Date()) {
  const start = startOfWeek(anchor, { weekStartsOn: 0 })
  const end = addDays(start, 6)
  return logs.reduce((sum, l) => {
    const d = parseISO(l.date)
    if (isWithinInterval(d, { start, end })) return sum + (l.count || 0)
    return sum
  }, 0)
}

export function normalizeIgId(raw: string) {
  return raw.trim().replace(/^@+/, '').toLowerCase()
}

/** 旧起業アプリ JSON → BusinessData */
export function extractBusinessFromLegacy(parsed: Record<string, unknown>): BusinessData {
  const base = emptyBusiness()
  const settings = (parsed.settings ?? {}) as Record<string, unknown>
  if (typeof settings.dmDailyGoal === 'number') base.dmDailyGoal = settings.dmDailyGoal
  if (typeof settings.dmWeeklyGoal === 'number') base.dmWeeklyGoal = settings.dmWeeklyGoal

  const salesLogs = Array.isArray(parsed.salesLogs) ? parsed.salesLogs : []
  for (const raw of salesLogs) {
    const l = raw as Record<string, unknown>
    if (l.type && l.type !== 'dm') continue
    const date = String(l.date ?? '').slice(0, 10)
    if (!date) continue
    base.salesLogs.push({
      id: String(l.id ?? uid()),
      date,
      count: Number(l.count) || 0,
    })
  }

  const snsLogs = Array.isArray(parsed.snsLogs) ? parsed.snsLogs : []
  for (const raw of snsLogs) {
    const l = raw as Record<string, unknown>
    const weekStart = String(l.weekStart ?? '').slice(0, 10)
    if (!weekStart) continue
    const ig = (l.instagram ?? {}) as Record<string, unknown>
    const sales = (l.sales ?? {}) as Record<string, unknown>
    base.snsLogs.push({
      id: String(l.id ?? uid()),
      weekStart: sundayOf(weekStart),
      instagram: {
        views: Number(ig.views) || 0,
        reach: Number(ig.reach) || 0,
        profileAccess: Number(ig.profileAccess) || 0,
        linkTaps: Number(ig.linkTaps) || 0,
      },
      sales: {
        dmSent: Number(sales.dmSent) || 0,
        replies: Number(sales.replies) || 0,
        meetings: Number(sales.meetings) || 0,
        orders: Number(sales.orders) || 0,
      },
      notes: String(l.notes ?? ''),
    })
  }

  const clients = Array.isArray(parsed.clients) ? parsed.clients : []
  for (const raw of clients) {
    const c = raw as Record<string, unknown>
    const status = String(c.status ?? 'lead')
    const allowed = ['lead', 'active', 'delivered', 'recurring', 'closed']
    base.clients.push({
      id: String(c.id ?? uid()),
      name: String(c.name ?? '無名'),
      status: (allowed.includes(status) ? status : 'lead') as Client['status'],
      projectFee: Number(c.projectFee) || 0,
      recurringFee: Number(c.recurringFee) || 0,
      memo: String(c.memo ?? ''),
      updatedAt: Date.parse(String(c.updatedAt ?? '')) || Date.now(),
    })
  }

  const igList = Array.isArray(parsed.igList) ? parsed.igList : []
  for (const raw of igList) {
    const g = raw as Record<string, unknown>
    const instagramId = normalizeIgId(String(g.instagramId ?? ''))
    if (!instagramId) continue
    base.igList.push({
      id: String(g.id ?? uid()),
      instagramId,
      name: String(g.name ?? ''),
      memo: String(g.memo ?? ''),
      createdAt: Date.parse(String(g.createdAt ?? '')) || Date.now(),
    })
  }

  return base
}

export function mergeBusiness(existing: BusinessData, incoming: BusinessData): BusinessData {
  const salesByDate = new Map(existing.salesLogs.map((l) => [l.date, l]))
  for (const l of incoming.salesLogs) {
    const cur = salesByDate.get(l.date)
    if (!cur) salesByDate.set(l.date, l)
    else salesByDate.set(l.date, { ...cur, count: Math.max(cur.count, l.count) })
  }

  const snsByWeek = new Map(existing.snsLogs.map((l) => [l.weekStart, l]))
  for (const l of incoming.snsLogs) {
    if (!snsByWeek.has(l.weekStart)) snsByWeek.set(l.weekStart, l)
  }

  const clientsById = new Map(existing.clients.map((c) => [c.id, c]))
  for (const c of incoming.clients) {
    if (!clientsById.has(c.id)) clientsById.set(c.id, c)
  }

  const igByNorm = new Map(existing.igList.map((g) => [normalizeIgId(g.instagramId), g]))
  for (const g of incoming.igList) {
    const key = normalizeIgId(g.instagramId)
    if (!igByNorm.has(key)) igByNorm.set(key, g)
  }

  return {
    dmDailyGoal: incoming.dmDailyGoal || existing.dmDailyGoal,
    dmWeeklyGoal: incoming.dmWeeklyGoal || existing.dmWeeklyGoal,
    salesLogs: [...salesByDate.values()].sort((a, b) => b.date.localeCompare(a.date)),
    snsLogs: [...snsByWeek.values()].sort((a, b) => b.weekStart.localeCompare(a.weekStart)),
    clients: [...clientsById.values()],
    igList: [...igByNorm.values()],
  }
}

export function syncDmMetricPoints(
  business: BusinessData,
  metrics: AppData['metrics'],
  businessSpaceId: string | undefined,
) {
  if (!businessSpaceId) return metrics
  const points = [...business.salesLogs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30)
    .map((l) => ({ date: l.date, value: l.count }))

  // 起業スペースは DM 系列のみ。旧データ等の「商談」など他系列は落とす
  const others = metrics.filter((m) => m.spaceId !== businessSpaceId)
  const existing = metrics.find((m) => m.spaceId === businessSpaceId && m.key === 'dm')
  const dm = {
    id: existing?.id || uid(),
    spaceId: businessSpaceId,
    key: 'dm',
    label: 'DM送信',
    points,
  }
  return [...others, dm]
}

export type { SnsWeekLog, IgEntry, Client, DmLog }
