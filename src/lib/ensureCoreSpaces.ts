import type { AppData, Space, Task } from '../types'
import { uid } from '../lib/id'
import { syncDmMetricPoints } from '../business/helpers'
import { syncBodyMetricPoints } from '../body/helpers'

const DEFAULT_BUSINESS_TASKS: Omit<Task, 'id' | 'spaceId' | 'createdAt'>[] = [
  { title: 'DM 10件（探す≤30分）', scope: 'today', done: false },
  { title: '返信は日程取りまで進める', scope: 'today', done: false },
  { title: '週DM 80 / 商談 2', scope: 'week', done: false },
]

const DEFAULT_BODY_TASKS: Omit<Task, 'id' | 'spaceId' | 'createdAt'>[] = [
  { title: 'トレーニング or 歩数確保', scope: 'today', done: false },
  { title: '体重を3回以上記録', scope: 'week', done: false },
]

function makeTasks(spaceId: string, defs: Omit<Task, 'id' | 'spaceId' | 'createdAt'>[]): Task[] {
  return defs.map((t) => ({
    ...t,
    id: uid(),
    spaceId,
    createdAt: Date.now(),
  }))
}

/**
 * 起業・筋トレのコア項目が消えていたら復元する。
 * business / body のデータ本体は残っている想定。
 */
export function ensureCoreSpaces(
  data: Pick<AppData, 'spaces' | 'tasks' | 'metrics' | 'business' | 'body'>,
): Pick<AppData, 'spaces' | 'tasks' | 'metrics'> {
  let spaces = [...(data.spaces ?? [])]
  let tasks = [...(data.tasks ?? [])]
  let metrics = [...(data.metrics ?? [])]

  let business = spaces.find((s) => s.kind === 'business' && !s.archived)
  if (!business) {
    business = {
      id: uid(),
      name: '起業',
      kind: 'business',
      color: '#2563eb',
      createdAt: Date.now(),
    } satisfies Space
    spaces.unshift(business)
    tasks = [...makeTasks(business.id, DEFAULT_BUSINESS_TASKS), ...tasks]
  } else {
    spaces = spaces.map((s) =>
      s.id === business!.id ? { ...s, name: '起業', color: '#2563eb' } : s,
    )
    business = spaces.find((s) => s.id === business!.id)!
  }

  let body = spaces.find((s) => s.kind === 'body' && !s.archived)
  if (!body) {
    body = {
      id: uid(),
      name: '筋トレ',
      kind: 'body',
      color: '#dc2626',
      createdAt: Date.now(),
    } satisfies Space
    const bizIdx = spaces.findIndex((s) => s.kind === 'business')
    if (bizIdx >= 0) spaces.splice(bizIdx + 1, 0, body)
    else spaces.unshift(body)
    tasks = [...makeTasks(body.id, DEFAULT_BODY_TASKS), ...tasks]
  }

  metrics = syncDmMetricPoints(data.business, metrics, business.id)
  metrics = syncBodyMetricPoints(data.body, metrics, body.id)

  return { spaces, tasks, metrics }
}
