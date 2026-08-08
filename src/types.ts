export type SpaceKind = 'business' | 'body' | 'custom'

export type TaskScope = 'today' | 'week'

export interface Space {
  id: string
  name: string
  kind: SpaceKind
  color: string
  temporary?: boolean
  archived?: boolean
  createdAt: number
}

export interface Task {
  id: string
  spaceId: string
  title: string
  scope: TaskScope
  done: boolean
  createdAt: number
}

export interface MetricPoint {
  date: string
  value: number
}

export interface MetricSeries {
  id: string
  spaceId: string
  key: string
  label: string
  unit?: string
  points: MetricPoint[]
}

export interface SyncState {
  enabled: boolean
  syncId: string
  lastPulledAt: number | null
  lastPushedAt: number | null
  status: 'idle' | 'syncing' | 'error' | 'offline'
  message?: string
}

/** 起業モジュール（旧起業アプリ相当） */
export interface DmLog {
  id: string
  date: string
  count: number
}

export interface SnsWeekLog {
  id: string
  weekStart: string
  instagram: {
    views: number
    reach: number
    profileAccess: number
    linkTaps: number
  }
  sales: {
    dmSent: number
    replies: number
    meetings: number
    orders: number
  }
  notes: string
}

export type ClientStatus = 'lead' | 'active' | 'delivered' | 'recurring' | 'closed'

export interface Client {
  id: string
  name: string
  status: ClientStatus
  projectFee: number
  recurringFee: number
  memo: string
  updatedAt: number
}

export interface IgEntry {
  id: string
  instagramId: string
  name: string
  memo: string
  createdAt: number
}

export interface BusinessData {
  dmDailyGoal: number
  dmWeeklyGoal: number
  salesLogs: DmLog[]
  snsLogs: SnsWeekLog[]
  clients: Client[]
  igList: IgEntry[]
}

/** 筋トレモジュール（旧体重アプリ相当） */
export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'other'

export interface BodySettings {
  height: number | null
  startWeight: number | null
  targetWeight: number | null
  targetDate: string | null
  dailyCalGoal: number
}

export interface DayRecord {
  weight: number | null
  dailyCalories: number | null
}

export interface Exercise {
  id: string
  name: string
  muscle: MuscleGroup
}

export interface WorkoutSet {
  weight: number
  reps: number
}

export interface WorkoutEntry {
  exerciseId: string
  sets: WorkoutSet[]
}

export interface Workout {
  id: string
  date: string
  note: string
  entries: WorkoutEntry[]
}

export interface BodyData {
  settings: BodySettings
  records: Record<string, DayRecord>
  exercises: Exercise[]
  workouts: Workout[]
}

export interface AppData {
  version: 2
  spaces: Space[]
  tasks: Task[]
  metrics: MetricSeries[]
  business: BusinessData
  body: BodyData
  sync: SyncState
  updatedAt: number
}

export const CLIENT_STATUS_LABEL: Record<ClientStatus, string> = {
  lead: '見込み',
  active: '進行中',
  delivered: '納品済',
  recurring: '継続',
  closed: '完了',
}
