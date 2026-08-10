import type { AppData, Space, Task } from '../types'
import { uid } from '../lib/id'
import { syncDmMetricPoints } from '../business/helpers'
import { syncBodyMetricPoints } from '../body/helpers'

const DEFAULT_BUSINESS_TASKS: Omit<Task, 'id' | 'spaceId' | 'createdAt'>[] = [
  { title: 'DM 10件（探す≤30分）', scope: 'today', done: false },
  { title: '返信は日程取りまで進める', scope: 'today', done: false },
  { title: '週DM 80 / 商談 2', scope: 'week', done: false },
]

/** 固定項目（削除不可）のキー */
export const LOCKED_SPACE_KEYS = [
  'business',
  'university',
  'body',
  'creative',
  'driving',
] as const

export type LockedSpaceKey = (typeof LOCKED_SPACE_KEYS)[number]

const PRESET_SPACES: {
  key: LockedSpaceKey
  name: string
  kind: Space['kind']
  color: string
}[] = [
  { key: 'business', name: '起業', kind: 'business', color: '#2563eb' },
  { key: 'university', name: '大学', kind: 'university', color: '#16a34a' },
  { key: 'body', name: '筋トレ', kind: 'body', color: '#dc2626' },
  { key: 'creative', name: '趣味', kind: 'custom', color: '#eab308' },
  { key: 'driving', name: '自動車学校', kind: 'driving', color: '#84cc16' },
]

function makeTasks(spaceId: string, defs: Omit<Task, 'id' | 'spaceId' | 'createdAt'>[]): Task[] {
  return defs.map((t) => ({
    ...t,
    id: uid(),
    spaceId,
    createdAt: Date.now(),
  }))
}

function spaceKey(sp: Space): string | undefined {
  if (sp.key) return sp.key
  if (sp.kind === 'business') return 'business'
  if (sp.kind === 'body') return 'body'
  if (sp.kind === 'university') return 'university'
  if (sp.kind === 'driving') return 'driving'
  if (sp.name === '大学') return 'university'
  if (sp.name === '創作' || sp.name === '趣味') return 'creative'
  if (sp.name === '自動車学校') return 'driving'
  return undefined
}

export function isLockedSpace(sp: Space) {
  const key = spaceKey(sp)
  return !!key && (LOCKED_SPACE_KEYS as readonly string[]).includes(key)
}

/**
 * コア項目が欠けていれば復元し、既定の並びへ寄せる。
 * ユーザーが並べ替えた既存項目は、欠けたものだけ挿入して順序を極力維持する。
 */
export function ensureCoreSpaces(
  data: Pick<AppData, 'spaces' | 'tasks' | 'metrics' | 'business' | 'body'>,
): Pick<AppData, 'spaces' | 'tasks' | 'metrics'> {
  let spaces = (data.spaces ?? []).map((sp) => {
    const key = spaceKey(sp)
    const preset = PRESET_SPACES.find((p) => p.key === key)
    if (!preset) return sp
    return {
      ...sp,
      key: preset.key,
      name: preset.name,
      kind: preset.kind,
      color: preset.color,
    }
  })
  let tasks = [...(data.tasks ?? [])]
  let metrics = [...(data.metrics ?? [])]

  const byKey = () => {
    const m = new Map<string, Space>()
    for (const sp of spaces) {
      const k = spaceKey(sp)
      if (k) m.set(k, sp)
    }
    return m
  }

  for (const preset of PRESET_SPACES) {
    const map = byKey()
    if (map.has(preset.key)) continue

    const created: Space = {
      id: uid(),
      name: preset.name,
      kind: preset.kind,
      color: preset.color,
      key: preset.key,
      createdAt: Date.now(),
    }

    const presetIdx = PRESET_SPACES.findIndex((p) => p.key === preset.key)
    let insertAt = spaces.length
    for (let i = presetIdx - 1; i >= 0; i--) {
      const prev = byKey().get(PRESET_SPACES[i].key)
      if (prev) {
        insertAt = spaces.findIndex((s) => s.id === prev.id) + 1
        break
      }
    }
    spaces.splice(insertAt, 0, created)

    if (preset.key === 'business') {
      tasks = [...makeTasks(created.id, DEFAULT_BUSINESS_TASKS), ...tasks]
    }
  }

  const business = byKey().get('business')
  const body = byKey().get('body')
  const hideMetricKeys = new Set(['body', 'university', 'driving', 'creative'])
  const hideMetricSpaceIds = new Set(
    spaces
      .filter((s) => {
        const k = spaceKey(s)
        return (k && hideMetricKeys.has(k)) || hideMetricKeys.has(s.kind)
      })
      .map((s) => s.id),
  )
  metrics = metrics.filter((m) => !hideMetricSpaceIds.has(m.spaceId))

  if (business) metrics = syncDmMetricPoints(data.business, metrics, business.id)
  if (body) metrics = syncBodyMetricPoints(data.body, metrics, body.id)

  return { spaces, tasks, metrics }
}

export function createDefaultSpaces(): Space[] {
  return PRESET_SPACES.map((p) => ({
    id: uid(),
    name: p.name,
    kind: p.kind,
    color: p.color,
    key: p.key,
    createdAt: Date.now(),
  }))
}
