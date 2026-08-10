import type {
  AttendanceMark,
  UniversityCourse,
  UniversityData,
  UniversityTermId,
} from '../types'
import {
  UNIVERSITY_TERM_IDS,
  UNIVERSITY_TERM_LABEL,
} from '../types'

export { UNIVERSITY_TERM_IDS, UNIVERSITY_TERM_LABEL }
export type { UniversityTermId }

export const SESSION_COUNT = 15
export const DEFAULT_TERM_ID: UniversityTermId = 'y3_zenki'

type CompactMark = 'o' | 'x' | ''

function expandMarks(raw: CompactMark[], count = SESSION_COUNT): AttendanceMark[] {
  const out: AttendanceMark[] = Array.from({ length: count }, () => null)
  for (let i = 0; i < count; i++) {
    const m = raw[i] ?? ''
    out[i] = m === 'o' ? 'present' : m === 'x' ? 'absent' : null
  }
  return out
}

function course(
  id: string,
  weekday: string,
  period: string,
  name: string,
  marks: CompactMark[],
  termId: UniversityTermId = DEFAULT_TERM_ID,
): UniversityCourse {
  return { id, termId, weekday, period, name, sessions: expandMarks(marks) }
}

export function isUniversityTermId(v: unknown): v is UniversityTermId {
  return typeof v === 'string' && (UNIVERSITY_TERM_IDS as string[]).includes(v)
}

/** Excel「出席管理_fixed.xlsx」の出席記録を焼き込み（3年前期） */
export const BAKED_UNIVERSITY: UniversityData = {
  sessionCount: SESSION_COUNT,
  activeTermId: DEFAULT_TERM_ID,
  goodRate: 0.8,
  cautionRate: 0.6,
  scholarshipCancelRate: 0.8,
  minAttendanceRate: 0.9,
  courses: [
    course('uni_health', '月曜', '2講目', '健康とスポーツⅠ', [
      'o', 'o', 'o', 'o', 'o', 'x', 'o', 'o', 'x', 'x', 'o', 'o', 'o', 'o', 'x',
    ]),
    course('uni_semi', '月曜', '4講目', 'ゼミナールⅠ', [
      'o', 'o', 'o', 'o', 'o', 'x', 'o', 'o', 'x', 'o', 'o', 'o', 'o', 'o', 'o',
    ]),
    course('uni_ethics', '水曜', '1講目', '情報倫理', [
      'o', 'o', 'o', 'o', 'x', 'o', 'o', 'o', 'o', 'x', 'x', 'o', 'o', 'o', 'o',
    ]),
    course('uni_draw1', '水曜', '2講目', '図形科学の基礎', [
      'o', 'o', 'o', 'o', 'o', 'o', 'o', 'o', 'o', 'x', 'x', 'o', 'o', 'o', '',
    ]),
    course('uni_draw2', '水曜', '3講目', '図形科学の基礎(2)', [
      'o', 'o', 'o', 'o', 'o', 'x', 'o', 'o', 'o', 'x', 'x', 'o', 'x', 'o', '',
    ]),
    course('uni_web1', '金曜', '1講目', 'Web制作演習', [
      'o', 'o', 'o', 'o', 'o', 'x', 'o', 'o', 'o', 'o', 'o', 'o', 'o', 'o', 'o',
    ]),
    course('uni_web2', '金曜', '2講目', 'Web制作演習(2)', [
      'o', 'o', 'o', 'o', 'o', 'x', 'o', 'o', 'o', 'o', 'o', 'o', 'o', 'o', 'o',
    ]),
    course('uni_art', '金曜', '3講目', '芸術論', [
      'o', 'o', 'o', 'o', 'o', 'x', 'o', 'o', 'o', 'o', 'o', 'o', 'o', 'o', 'o',
    ]),
    course('uni_career', '金曜', '4講目', 'キャリアデザインⅢ', [
      'o', 'o', 'o', 'o', 'o', 'x', 'o', 'o', 'o', 'o', 'o', 'o', 'x', 'o', 'x',
    ]),
  ],
}

export function emptyUniversity(): UniversityData {
  return {
    sessionCount: SESSION_COUNT,
    activeTermId: DEFAULT_TERM_ID,
    goodRate: 0.8,
    cautionRate: 0.6,
    scholarshipCancelRate: 0.8,
    minAttendanceRate: 0.9,
    courses: [],
  }
}

export function courseKey(
  c: Pick<UniversityCourse, 'termId' | 'weekday' | 'period' | 'name'>,
) {
  return `${c.termId}|${c.weekday}|${c.period}|${c.name}`
}

export function coursesForTerm(data: UniversityData, termId?: UniversityTermId) {
  const tid = termId ?? data.activeTermId
  return data.courses.filter((c) => c.termId === tid)
}

export function normalizeCourse(raw: unknown, sessionCount = SESSION_COUNT): UniversityCourse | null {
  if (!raw || typeof raw !== 'object') return null
  const c = raw as Record<string, unknown>
  const name = String(c.name ?? '').trim()
  if (!name) return null
  const sessionsRaw = Array.isArray(c.sessions) ? c.sessions : []
  const sessions: AttendanceMark[] = Array.from({ length: sessionCount }, (_, i) => {
    const v = sessionsRaw[i]
    if (v === 'present' || v === 'o' || v === '○') return 'present'
    if (v === 'absent' || v === 'x' || v === '×') return 'absent'
    return null
  })
  const termId = isUniversityTermId(c.termId) ? c.termId : DEFAULT_TERM_ID
  const weekday = String(c.weekday ?? '')
  const period = String(c.period ?? '')
  return {
    id: String(c.id ?? courseKey({ termId, weekday, period, name })),
    termId,
    weekday,
    period,
    name,
    sessions,
  }
}

export function hydrateUniversity(raw: unknown): UniversityData {
  const base = emptyUniversity()
  if (!raw || typeof raw !== 'object') return base
  const u = raw as Record<string, unknown>
  const sessionCount = Number(u.sessionCount) || SESSION_COUNT
  const courses = Array.isArray(u.courses)
    ? u.courses
        .map((c) => normalizeCourse(c, sessionCount))
        .filter((c): c is UniversityCourse => !!c)
    : []
  return {
    sessionCount,
    activeTermId: isUniversityTermId(u.activeTermId) ? u.activeTermId : DEFAULT_TERM_ID,
    goodRate: Number(u.goodRate) || base.goodRate,
    cautionRate: Number(u.cautionRate) || base.cautionRate,
    scholarshipCancelRate: Number(u.scholarshipCancelRate) || base.scholarshipCancelRate,
    minAttendanceRate: Number(u.minAttendanceRate) || base.minAttendanceRate,
    courses,
  }
}

export function mergeUniversity(existing: UniversityData, baked: UniversityData): UniversityData {
  const byKey = new Map(existing.courses.map((c) => [courseKey(c), c]))
  for (const c of baked.courses) {
    const k = courseKey(c)
    if (!byKey.has(k)) byKey.set(k, c)
  }
  const seen = new Set<string>()
  const courses: UniversityCourse[] = []
  for (const c of baked.courses) {
    const k = courseKey(c)
    const cur = byKey.get(k)
    if (cur) {
      courses.push(cur)
      seen.add(k)
    }
  }
  for (const [k, c] of byKey) {
    if (!seen.has(k)) courses.push(c)
  }
  return {
    sessionCount: existing.sessionCount || baked.sessionCount,
    activeTermId: existing.activeTermId || baked.activeTermId || DEFAULT_TERM_ID,
    goodRate: existing.goodRate || baked.goodRate,
    cautionRate: existing.cautionRate || baked.cautionRate,
    scholarshipCancelRate: existing.scholarshipCancelRate || baked.scholarshipCancelRate,
    minAttendanceRate: existing.minAttendanceRate || baked.minAttendanceRate,
    courses,
  }
}

export function courseStats(course: UniversityCourse) {
  let present = 0
  let absent = 0
  for (const m of course.sessions) {
    if (m === 'present') present += 1
    else if (m === 'absent') absent += 1
  }
  const held = present + absent
  const rate = held > 0 ? present / held : null
  return { present, absent, held, rate }
}

export function overallStats(data: UniversityData, termId?: UniversityTermId) {
  let present = 0
  let absent = 0
  for (const c of coursesForTerm(data, termId)) {
    const s = courseStats(c)
    present += s.present
    absent += s.absent
  }
  const held = present + absent
  const rate = held > 0 ? present / held : null
  return { present, absent, held, rate }
}

export type AttendanceStatus = 'good' | 'caution' | 'danger' | 'none'

export function rateStatus(rate: number | null, data: UniversityData): AttendanceStatus {
  if (rate == null) return 'none'
  if (rate >= data.goodRate) return 'good'
  if (rate >= data.cautionRate) return 'caution'
  return 'danger'
}

export function statusLabel(status: AttendanceStatus) {
  if (status === 'good') return '良好'
  if (status === 'caution') return '注意'
  if (status === 'danger') return '危険'
  return '—'
}

export function formatRate(rate: number | null) {
  if (rate == null) return '—'
  return `${Math.round(rate * 1000) / 10}%`
}

export function cycleMark(current: AttendanceMark): AttendanceMark {
  if (current == null) return 'present'
  if (current === 'present') return 'absent'
  return null
}

export function markLabel(m: AttendanceMark) {
  if (m === 'present') return '○'
  if (m === 'absent') return '×'
  return '·'
}
