import type { DrivingData, DrivingItem, DrivingSection } from '../types'
import { normalizeDateStr } from '../lib/deadline'

function items(
  sectionId: string,
  defs: { id: string; label: string; done?: boolean }[],
): DrivingItem[] {
  return defs.map((d) => ({
    id: `${sectionId}_${d.id}`,
    label: d.label,
    done: !!d.done,
  }))
}

function section(
  id: string,
  title: string,
  defs: { id: string; label: string; done?: boolean }[],
  note?: string,
): DrivingSection {
  return { id, title, note, items: items(id, defs) }
}

/** Excel「免許交付チェックシート_AT.xlsx」のチェック項目を焼き込み */
export const BAKED_DRIVING: DrivingData = {
  title: '手稲自動車学校｜入校〜免許取得チェックシート（普通車AT）',
  footnote:
    '※手稲自動車学校「入校から免許取得までの流れ」準拠／普通車AT。効果測定①②はそれぞれ合格目安（仮免45点・本免90点）を2回。',
  startDate: null,
  targetDate: null,
  sections: [
    section('start', 'スタート', [
      { id: 'enroll', label: '入校式', done: true },
      { id: 'lec1', label: '1段階 学科①', done: true },
    ]),
    section(
      's1_skill',
      '1段階 技能（AT 12時限）',
      Array.from({ length: 12 }, (_, i) => ({
        id: String(i + 1),
        label: `${i + 1}時限`,
        done: i < 7,
      })),
      '11・12時限は効果測定2回合格後',
    ),
    section(
      's1_lec',
      '1段階 学科（項目2〜10）',
      Array.from({ length: 9 }, (_, i) => ({
        id: String(i + 2),
        label: `学科${['②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'][i]}`,
        done: true,
      })),
      '終了後→効果測定45点以上×2回',
    ),
    section('s1_exam', '修了検定・仮免許（月・水・金）', [
      { id: 'effect1', label: '効果測定①' },
      { id: 'effect2', label: '効果測定②' },
      { id: 'finish', label: '修了検定' },
      { id: 'temp', label: '仮免許取得' },
    ]),
    section('s2_start', '2段階スタート', [
      { id: 'lec11', label: '2段階 学科⑪' },
    ]),
    section(
      's2_skill',
      '2段階 技能（19時限）',
      Array.from({ length: 19 }, (_, i) => ({
        id: String(i + 1),
        label: `${i + 1}時限`,
      })),
      '18・19時限は効果測定2回合格後',
    ),
    section(
      's2_lec',
      '2段階 学科',
      [
        { id: '1', label: '①' },
        { id: '2', label: '②応' },
        { id: '3', label: '③応' },
        { id: '4', label: '④応' },
        { id: '5', label: '⑤' },
        { id: '6', label: '⑥' },
        { id: '7', label: '⑦' },
        { id: '8', label: '⑧' },
        { id: '9', label: '⑨' },
        { id: '10', label: '⑩' },
        { id: '12', label: '⑫' },
        { id: '13', label: '⑬' },
        { id: '14', label: '⑭' },
        { id: '15', label: '⑮' },
        { id: '16', label: '⑯' },
      ],
      '①技能同時／②③④応急救護は予約／⑤〜⑩⑫〜⑯',
    ),
    section('grad', '卒業検定〜免許交付', [
      { id: 'effect1', label: '効果測定①' },
      { id: 'effect2', label: '効果測定②' },
      { id: 'grad_exam', label: '卒業検定' },
      { id: 'graduate', label: '卒業' },
      { id: 'main_exam', label: '本免学科' },
      { id: 'license', label: '免許交付' },
    ], '卒検：火・木・土／本免：札幌運転免許試験場'),
  ],
}

export function emptyDriving(): DrivingData {
  return {
    title: BAKED_DRIVING.title,
    footnote: BAKED_DRIVING.footnote,
    startDate: null,
    targetDate: null,
    sections: [],
  }
}

export function hydrateDriving(raw: unknown): DrivingData {
  const base = emptyDriving()
  if (!raw || typeof raw !== 'object') return base
  const d = raw as Record<string, unknown>
  const sections = Array.isArray(d.sections)
    ? d.sections
        .map((sec): DrivingSection | null => {
          if (!sec || typeof sec !== 'object') return null
          const s = sec as Record<string, unknown>
          const id = String(s.id ?? '')
          const title = String(s.title ?? '').trim()
          if (!id || !title) return null
          const itemsRaw = Array.isArray(s.items) ? s.items : []
          const items: DrivingItem[] = itemsRaw
            .map((it): DrivingItem | null => {
              if (!it || typeof it !== 'object') return null
              const x = it as Record<string, unknown>
              const itemId = String(x.id ?? '')
              const label = String(x.label ?? '').trim()
              if (!itemId || !label) return null
              return { id: itemId, label, done: !!x.done }
            })
            .filter((x): x is DrivingItem => !!x)
          return {
            id,
            title,
            note: s.note != null ? String(s.note) : undefined,
            items,
          }
        })
        .filter((s): s is DrivingSection => !!s)
    : []
  const targetDate = normalizeDateStr(d.targetDate)
  const startDate = normalizeDateStr(d.startDate)
  return {
    title: String(d.title ?? base.title) || base.title,
    footnote: String(d.footnote ?? base.footnote) || base.footnote,
    startDate,
    targetDate,
    sections,
  }
}

export function mergeDriving(existing: DrivingData, baked: DrivingData): DrivingData {
  const bySection = new Map(existing.sections.map((s) => [s.id, s]))
  const sections: DrivingSection[] = baked.sections.map((bakedSec) => {
    const cur = bySection.get(bakedSec.id)
    if (!cur) return bakedSec
    const byItem = new Map(cur.items.map((i) => [i.id, i]))
    const items = bakedSec.items.map((bi) => {
      const existingItem = byItem.get(bi.id)
      return existingItem ?? bi
    })
    // keep any extra user items after baked order
    const bakedIds = new Set(bakedSec.items.map((i) => i.id))
    for (const i of cur.items) {
      if (!bakedIds.has(i.id)) items.push(i)
    }
    return {
      ...bakedSec,
      ...cur,
      title: bakedSec.title,
      note: bakedSec.note,
      items,
    }
  })
  const bakedIds = new Set(baked.sections.map((s) => s.id))
  for (const s of existing.sections) {
    if (!bakedIds.has(s.id)) sections.push(s)
  }
  return {
    title: existing.title || baked.title,
    footnote: existing.footnote || baked.footnote,
    startDate: existing.startDate ?? baked.startDate ?? null,
    targetDate: existing.targetDate ?? baked.targetDate ?? null,
    sections,
  }
}

export function drivingProgress(data: DrivingData) {
  let done = 0
  let total = 0
  for (const s of data.sections) {
    for (const i of s.items) {
      total += 1
      if (i.done) done += 1
    }
  }
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return { done, total, pct }
}

export function progressBarChars(pct: number, width = 20) {
  const filled = Math.max(0, Math.min(width, Math.round((pct / 100) * width)))
  return `[${'■'.repeat(filled)}${'□'.repeat(width - filled)}]`
}
