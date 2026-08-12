export type SpaceKind = 'business' | 'body' | 'university' | 'driving' | 'custom'

export type TaskScope = 'today' | 'week'

export interface Space {
  id: string
  name: string
  kind: SpaceKind
  color: string
  /** 固定プリセット識別子（並び替え可・削除不可） */
  key?: string
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

/** 2週に1サイト制作チェック（月曜起点の2週期間） */
export interface SiteBuildCheck {
  /** 当該期間の開始日（月曜 yyyy-MM-dd） */
  periodStart: string
  done: boolean
}

export interface BusinessData {
  dmDailyGoal: number
  dmWeeklyGoal: number
  salesLogs: DmLog[]
  snsLogs: SnsWeekLog[]
  clients: Client[]
  igList: IgEntry[]
  siteBuild: SiteBuildCheck
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
  /** 目標期間の開始日 (yyyy-MM-dd) */
  targetStartDate: string | null
  /** 目標の達成期限 (yyyy-MM-dd) */
  targetDate: string | null
  dailyCalGoal: number
  /** 減量期 / 維持期 / 増量期 */
  phase: BodyPhase
}

export type BodyPhase = 'cut' | 'maintain' | 'bulk'

export const BODY_PHASE_LABEL: Record<BodyPhase, string> = {
  cut: '減量期',
  maintain: '維持期',
  bulk: '増量期',
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

/** 大学・出席管理（Excel 出席管理相当） */
export type AttendanceMark = 'present' | 'absent' | null

/** 学年・学期（現在データは 3年前期） */
export type UniversityTermId = 'y3_zenki' | 'y3_kouki' | 'y4_zenki' | 'y4_kouki'

export const UNIVERSITY_TERM_LABEL: Record<UniversityTermId, string> = {
  y3_zenki: '3年前期',
  y3_kouki: '3年後期',
  y4_zenki: '4年前期',
  y4_kouki: '4年後期',
}

export const UNIVERSITY_TERM_IDS: UniversityTermId[] = [
  'y3_zenki',
  'y3_kouki',
  'y4_zenki',
  'y4_kouki',
]

export interface UniversityCourse {
  id: string
  termId: UniversityTermId
  weekday: string
  period: string
  name: string
  /** 第1回〜第N回（空欄=未実施） */
  sessions: AttendanceMark[]
}

export interface UniversityData {
  sessionCount: number
  /** 表示・編集中の学期 */
  activeTermId: UniversityTermId
  /** 良好判定の下限（既定 0.8） */
  goodRate: number
  /** 注意判定の下限（既定 0.6） */
  cautionRate: number
  /** 奨学金取り消しライン（既定 0.8） */
  scholarshipCancelRate: number
  /** 目標出席率（既定 0.9） */
  minAttendanceRate: number
  courses: UniversityCourse[]
}

/** 自動車学校・免許交付チェック（Excel チェックシート相当） */
export interface DrivingItem {
  id: string
  label: string
  done: boolean
}

export interface DrivingSection {
  id: string
  title: string
  note?: string
  items: DrivingItem[]
}

export interface DrivingData {
  title: string
  footnote: string
  /** 取組開始日 (yyyy-MM-dd) */
  startDate: string | null
  /** 免許取得などの達成期限 (yyyy-MM-dd) */
  targetDate: string | null
  sections: DrivingSection[]
}

export interface AppData {
  version: 2
  spaces: Space[]
  tasks: Task[]
  metrics: MetricSeries[]
  business: BusinessData
  body: BodyData
  university: UniversityData
  driving: DrivingData
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
