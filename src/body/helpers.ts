import { addDays, format, parseISO, startOfWeek } from 'date-fns'
import type {
  AppData,
  BodyData,
  BodySettings,
  DayRecord,
  Exercise,
  MuscleGroup,
  Workout,
  WorkoutSet,
} from '../types'
import { uid } from '../lib/id'

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: '胸',
  back: '背中',
  legs: '脚',
  shoulders: '肩',
  arms: '腕',
  core: '体幹',
  other: 'その他',
}

export const SEED_EXERCISES: Exercise[] = [
  { id: 'ex_bench', name: 'ベンチプレス', muscle: 'chest' },
  { id: 'ex_squat', name: 'スクワット', muscle: 'legs' },
  { id: 'ex_deadlift', name: 'デッドリフト', muscle: 'back' },
  { id: 'ex_ohp', name: 'ショルダープレス', muscle: 'shoulders' },
  { id: 'ex_row', name: 'ベントオーバーロウ', muscle: 'back' },
  { id: 'ex_curl', name: 'アームカール', muscle: 'arms' },
]

export function emptyBodySettings(): BodySettings {
  return {
    height: null,
    startWeight: null,
    targetWeight: null,
    targetDate: null,
    dailyCalGoal: 2000,
  }
}

export function emptyBody(): BodyData {
  return {
    settings: emptyBodySettings(),
    records: {},
    exercises: SEED_EXERCISES.map((e) => ({ ...e })),
    workouts: [],
  }
}

export function todayStr(d = new Date()) {
  return format(d, 'yyyy-MM-dd')
}

/** 月曜始まりの週 */
export function mondayOf(dateStr: string) {
  return format(startOfWeek(parseISO(dateStr), { weekStartsOn: 1 }), 'yyyy-MM-dd')
}

export function weekDates(anchor = todayStr()) {
  const start = parseISO(mondayOf(anchor))
  return Array.from({ length: 7 }, (_, i) => format(addDays(start, i), 'yyyy-MM-dd'))
}

export function normalizeRecord(rec: unknown): DayRecord {
  if (!rec || typeof rec !== 'object') return { weight: null, dailyCalories: null }
  const r = rec as Record<string, unknown>
  let dailyCalories =
    r.dailyCalories != null && r.dailyCalories !== ''
      ? Number(r.dailyCalories)
      : null
  if ((dailyCalories == null || Number.isNaN(dailyCalories)) && Array.isArray(r.meals)) {
    dailyCalories = (r.meals as { kcal?: number }[]).reduce(
      (s, m) => s + (Number(m.kcal) || 0),
      0,
    )
  }
  if (dailyCalories != null && Number.isNaN(dailyCalories)) dailyCalories = null
  const weight =
    r.weight != null && r.weight !== '' ? Number(r.weight) : null
  return {
    weight: weight != null && !Number.isNaN(weight) ? Math.round(weight * 10) / 10 : null,
    dailyCalories:
      dailyCalories != null && !Number.isNaN(dailyCalories)
        ? Math.round(dailyCalories)
        : null,
  }
}

export function normalizeRecords(records: unknown): Record<string, DayRecord> {
  const out: Record<string, DayRecord> = {}
  if (!records || typeof records !== 'object') return out
  for (const [date, rec] of Object.entries(records as Record<string, unknown>)) {
    const key = String(date).slice(0, 10)
    if (!key) continue
    out[key] = normalizeRecord(rec)
  }
  return out
}

function isMuscle(v: unknown): v is MuscleGroup {
  return typeof v === 'string' && v in MUSCLE_LABELS
}

export function normalizeExercise(ex: unknown): Exercise | null {
  if (!ex || typeof ex !== 'object') return null
  const e = ex as Record<string, unknown>
  const name = String(e.name ?? '').trim().slice(0, 40)
  if (!name) return null
  return {
    id: String(e.id || uid()),
    name,
    muscle: isMuscle(e.muscle) ? e.muscle : 'other',
  }
}

export function normalizeExercises(list: unknown): Exercise[] {
  const out: Exercise[] = []
  const seen = new Set<string>()
  if (!Array.isArray(list)) return out
  for (const ex of list) {
    const n = normalizeExercise(ex)
    if (!n || seen.has(n.id)) continue
    seen.add(n.id)
    out.push(n)
  }
  return out
}

export function normalizeSet(set: unknown): WorkoutSet | null {
  if (!set || typeof set !== 'object') return null
  const s = set as Record<string, unknown>
  const weight = Number(s.weight)
  const reps = parseInt(String(s.reps), 10)
  if (Number.isNaN(weight) || weight < 0 || Number.isNaN(reps) || reps <= 0) return null
  return { weight: Math.round(weight * 10) / 10, reps }
}

export function normalizeWorkout(w: unknown): Workout | null {
  if (!w || typeof w !== 'object') return null
  const raw = w as Record<string, unknown>
  const date = String(raw.date ?? '').slice(0, 10)
  if (!date) return null
  const entries: Workout['entries'] = []
  for (const entry of Array.isArray(raw.entries) ? raw.entries : []) {
    if (!entry || typeof entry !== 'object') continue
    const e = entry as Record<string, unknown>
    const exerciseId = String(e.exerciseId ?? '')
    if (!exerciseId) continue
    const sets = (Array.isArray(e.sets) ? e.sets : [])
      .map(normalizeSet)
      .filter((x): x is WorkoutSet => x != null)
    entries.push({ exerciseId, sets })
  }
  return {
    id: String(raw.id || uid()),
    date,
    note: raw.note ? String(raw.note).slice(0, 200) : '',
    entries,
  }
}

export function normalizeWorkouts(list: unknown): Workout[] {
  if (!Array.isArray(list)) return []
  return list.map(normalizeWorkout).filter((x): x is Workout => x != null)
}

export function hydrateBody(parsed: Partial<BodyData> | Record<string, unknown>): BodyData {
  const settings = {
    ...emptyBodySettings(),
    ...((parsed.settings as BodySettings) || {}),
  }
  if (!settings.dailyCalGoal || settings.dailyCalGoal < 1) settings.dailyCalGoal = 2000
  let exercises = normalizeExercises(parsed.exercises)
  if (!exercises.length) exercises = SEED_EXERCISES.map((e) => ({ ...e }))
  return {
    settings,
    records: normalizeRecords(parsed.records),
    exercises,
    workouts: normalizeWorkouts(parsed.workouts),
  }
}

/** 旧体重アプリ JSON → BodyData */
export function extractBodyFromLegacy(parsed: Record<string, unknown>): BodyData {
  return hydrateBody(parsed)
}

export function mergeBody(existing: BodyData, incoming: BodyData): BodyData {
  const records = { ...existing.records }
  for (const [date, rec] of Object.entries(incoming.records)) {
    const cur = records[date]
    if (!cur) {
      records[date] = rec
      continue
    }
    records[date] = {
      weight: rec.weight ?? cur.weight,
      dailyCalories: rec.dailyCalories ?? cur.dailyCalories,
    }
  }

  const exercisesById = new Map(existing.exercises.map((e) => [e.id, e]))
  for (const e of incoming.exercises) {
    if (!exercisesById.has(e.id)) exercisesById.set(e.id, e)
  }

  const workoutsByDate = new Map(existing.workouts.map((w) => [w.date, w]))
  for (const w of incoming.workouts) {
    const cur = workoutsByDate.get(w.date)
    if (!cur || (w.entries?.length ?? 0) >= (cur.entries?.length ?? 0)) {
      workoutsByDate.set(w.date, w)
    }
  }

  return {
    settings: {
      ...existing.settings,
      ...Object.fromEntries(
        Object.entries(incoming.settings).filter(([, v]) => v != null && v !== ''),
      ),
      dailyCalGoal: incoming.settings.dailyCalGoal || existing.settings.dailyCalGoal,
    },
    records,
    exercises: [...exercisesById.values()],
    workouts: [...workoutsByDate.values()].sort((a, b) => b.date.localeCompare(a.date)),
  }
}

export function latestWeight(body: BodyData): number | null {
  const dates = Object.keys(body.records).sort()
  for (let i = dates.length - 1; i >= 0; i--) {
    const w = body.records[dates[i]]?.weight
    if (w != null) return w
  }
  return null
}

export function goalProgress(body: BodyData): number | null {
  const { startWeight, targetWeight } = body.settings
  const current = latestWeight(body)
  if (startWeight == null || targetWeight == null || current == null) return null
  const denom = startWeight - targetWeight
  if (Math.abs(denom) < 0.01) return null
  const pct = ((startWeight - current) / denom) * 100
  return Math.max(0, Math.min(100, Math.round(pct)))
}

export function weekCalSum(body: BodyData, anchor = todayStr()) {
  return weekDates(anchor).reduce((sum, d) => {
    const c = body.records[d]?.dailyCalories
    return sum + (c != null ? c : 0)
  }, 0)
}

export function setVolume(sets: WorkoutSet[]) {
  return sets.reduce((s, x) => s + x.weight * x.reps, 0)
}

export function est1rm(weight: number, reps: number) {
  if (reps <= 0) return weight
  return Math.round(weight * (1 + reps / 30) * 10) / 10
}

export function workoutVolume(w: Workout) {
  return w.entries.reduce((s, e) => s + setVolume(e.sets), 0)
}

export function syncBodyMetricPoints(
  body: BodyData,
  metrics: AppData['metrics'],
  bodySpaceId: string | undefined,
) {
  if (!bodySpaceId) return metrics

  const weightPoints = Object.entries(body.records)
    .filter(([, r]) => r.weight != null)
    .map(([date, r]) => ({ date, value: r.weight as number }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-90)

  const calPoints = Object.entries(body.records)
    .filter(([, r]) => r.dailyCalories != null)
    .map(([date, r]) => ({ date, value: r.dailyCalories as number }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-90)

  let next = [...metrics]

  const upsert = (key: string, label: string, points: { date: string; value: number }[]) => {
    if (points.length === 0) {
      next = next.filter((m) => !(m.spaceId === bodySpaceId && m.key === key))
      return
    }
    const existing = next.find((m) => m.spaceId === bodySpaceId && m.key === key)
    if (existing) {
      next = next.map((m) => (m.id === existing.id ? { ...m, label, points } : m))
    } else {
      next.push({
        id: uid(),
        spaceId: bodySpaceId,
        key,
        label,
        points,
      })
    }
  }

  upsert('weight', '体重 kg', weightPoints)
  upsert('calories', 'カロリー kcal', calPoints)
  return next
}
