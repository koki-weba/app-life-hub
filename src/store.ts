import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createSeedData } from './seed'
import { uid } from './lib/id'
import type {
  AppData,
  AttendanceMark,
  BodyData,
  BodySettings,
  BusinessData,
  Client,
  ClientStatus,
  Exercise,
  IgEntry,
  MuscleGroup,
  Space,
  SpaceKind,
  SnsWeekLog,
  Task,
  TaskScope,
  UniversityTermId,
  Workout,
} from './types'
import {
  pullRemote,
  pushRemote,
  ensureSyncId,
  issueNewSyncId,
  signInPuter,
  signOutPuter,
  getPuterUsername,
} from './sync/puterSync'
import {
  emptyBusiness,
  mergeBusiness,
  normalizeIgId,
  sundayOf,
  syncDmMetricPoints,
  todayStr,
} from './business/helpers'
import {
  emptyBody,
  hydrateBody,
  mergeBody,
  syncBodyMetricPoints,
} from './body/helpers'
import {
  BAKED_UNIVERSITY,
  emptyUniversity,
  hydrateUniversity,
  mergeUniversity,
  SESSION_COUNT,
} from './university/helpers'
import {
  BAKED_DRIVING,
  emptyDriving,
  hydrateDriving,
  mergeDriving,
} from './driving/helpers'
import { BAKED_BODY, BAKED_BUSINESS } from './data/bakedLegacy'
import { ensureCoreSpaces, isLockedSpace } from './lib/ensureCoreSpaces'

const STORAGE_KEY = 'lifeHub_data_v1'

type HubState = AppData & {
  activeView: 'home' | 'space' | 'settings'
  activeSpaceId: string | null
  setView: (view: HubState['activeView'], spaceId?: string | null) => void
  toggleTask: (id: string) => void
  addTask: (spaceId: string, title: string, scope: TaskScope) => void
  deleteTask: (id: string) => void
  addSpace: (name: string, kind: SpaceKind, temporary?: boolean) => void
  removeSpace: (id: string) => void
  reorderSpaces: (orderedIds: string[]) => void
  addMetricPoint: (seriesId: string, value: number, date?: string) => void
  bumpDm: (delta: number) => void
  setBusinessGoals: (daily: number, weekly: number) => void
  saveSnsWeek: (log: Omit<SnsWeekLog, 'id'> & { id?: string }) => void
  deleteSnsWeek: (id: string) => void
  saveClient: (client: Omit<Client, 'id' | 'updatedAt'> & { id?: string }) => void
  deleteClient: (id: string) => void
  saveIg: (entry: Omit<IgEntry, 'id' | 'createdAt'> & { id?: string }) => string | null
  deleteIg: (id: string) => void
  saveDayWeight: (date: string, weight: number) => void
  saveDayCalories: (date: string, calories: number) => void
  saveBodySettings: (settings: Partial<BodySettings>) => void
  saveExercise: (ex: { id?: string; name: string; muscle: MuscleGroup }) => void
  deleteExercise: (id: string) => void
  saveWorkout: (workout: Omit<Workout, 'id'> & { id?: string }) => void
  deleteWorkout: (date: string) => void
  setAttendance: (courseId: string, sessionIndex: number, mark: AttendanceMark) => void
  setActiveUniversityTerm: (termId: UniversityTermId) => void
  addUniversityCourse: (weekday: string, period: string, name: string) => void
  deleteUniversityCourse: (courseId: string) => void
  toggleDrivingItem: (sectionId: string, itemId: string) => void
  setDrivingDates: (dates: {
    startDate?: string | null
    targetDate?: string | null
  }) => void
  setSyncEnabled: (enabled: boolean) => void
  rotateSyncId: () => void
  setSyncId: (id: string) => void
  syncNow: () => Promise<void>
  puterSignIn: () => Promise<void>
  puterSignOut: () => Promise<void>
  /** この端末のデータをクラウドに強制上書き（スマホ側で使う） */
  pushLocalOverwrite: () => Promise<void>
  /** クラウドをこの端末に強制取り込み（PC側で使う） */
  pullRemoteOverwrite: () => Promise<void>
  replaceData: (data: AppData) => void
  exportJson: () => string
}

function stamp() {
  return { updatedAt: Date.now() }
}

/** 同時実行を1本にまとめる（自動同期の連打対策） */
let syncInFlight: Promise<void> | null = null


function businessSpaceId(spaces: Space[]) {
  return spaces.find((s) => s.kind === 'business' && !s.archived)?.id
}

function bodySpaceId(spaces: Space[]) {
  return spaces.find((s) => s.kind === 'body' && !s.archived)?.id
}

function withDmMetrics(s: HubState, business: BusinessData) {
  const sid = businessSpaceId(s.spaces)
  return {
    business,
    metrics: syncDmMetricPoints(business, s.metrics, sid),
  }
}

function withBodyMetrics(s: HubState, body: BodyData) {
  const sid = bodySpaceId(s.spaces)
  return {
    body,
    metrics: syncBodyMetricPoints(body, s.metrics, sid),
  }
}

export const useHub = create<HubState>()(
  persist(
    (set, get) => {
      const seed = createSeedData()
      return {
        ...seed,
        activeView: 'home',
        activeSpaceId: null,

        setView: (view, spaceId = null) =>
          set({ activeView: view, activeSpaceId: spaceId }),

        toggleTask: (id) =>
          set((s) => ({
            ...stamp(),
            tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
          })),

        addTask: (spaceId, title, scope) => {
          const task: Task = {
            id: uid(),
            spaceId,
            title: title.trim(),
            scope,
            done: false,
            createdAt: Date.now(),
          }
          if (!task.title) return
          set((s) => ({ ...stamp(), tasks: [task, ...s.tasks] }))
        },

        deleteTask: (id) =>
          set((s) => ({
            ...stamp(),
            tasks: s.tasks.filter((t) => t.id !== id),
          })),

        addSpace: (name, kind, temporary = false) => {
          set((s) => {
            if (
              (kind === 'business' ||
                kind === 'body' ||
                kind === 'university' ||
                kind === 'driving') &&
              s.spaces.some((x) => x.kind === kind && !x.archived)
            ) {
              return s
            }
            const space: Space = {
              id: uid(),
              name:
                name.trim() ||
                (kind === 'business'
                  ? '起業'
                  : kind === 'body'
                    ? '筋トレ'
                    : kind === 'university'
                      ? '大学'
                      : kind === 'driving'
                        ? '自動車学校'
                        : '新しい項目'),
              kind,
              color:
                kind === 'business'
                  ? '#2563eb'
                  : kind === 'body'
                    ? '#dc2626'
                    : kind === 'university'
                      ? '#16a34a'
                      : kind === 'driving'
                        ? '#84cc16'
                        : '#64748b',
              temporary,
              createdAt: Date.now(),
            }
            return { ...stamp(), spaces: [...s.spaces, space] }
          })
        },

        removeSpace: (id) =>
          set((s) => {
            const target = s.spaces.find((x) => x.id === id)
            if (target && isLockedSpace(target)) return s
            return {
              ...stamp(),
              spaces: s.spaces.filter((x) => x.id !== id),
              tasks: s.tasks.filter((t) => t.spaceId !== id),
              metrics: s.metrics.filter((m) => m.spaceId !== id),
              activeSpaceId: s.activeSpaceId === id ? null : s.activeSpaceId,
              activeView: s.activeSpaceId === id ? 'home' : s.activeView,
            }
          }),

        reorderSpaces: (orderedIds) =>
          set((s) => {
            const map = new Map(s.spaces.map((sp) => [sp.id, sp]))
            const next: typeof s.spaces = []
            for (const id of orderedIds) {
              const sp = map.get(id)
              if (sp) {
                next.push(sp)
                map.delete(id)
              }
            }
            for (const sp of map.values()) next.push(sp)
            return { ...stamp(), spaces: next }
          }),

        addMetricPoint: (seriesId, value, date) => {
          const d = date || todayStr()
          set((s) => ({
            ...stamp(),
            metrics: s.metrics.map((m) => {
              if (m.id !== seriesId) return m
              const rest = m.points.filter((p) => p.date !== d)
              return {
                ...m,
                points: [...rest, { date: d, value }].sort((a, b) =>
                  a.date.localeCompare(b.date),
                ),
              }
            }),
          }))
        },

        bumpDm: (delta) =>
          set((s) => {
            const date = todayStr()
            const logs = [...(s.business?.salesLogs ?? [])]
            const idx = logs.findIndex((l) => l.date === date)
            if (idx < 0) {
              if (delta <= 0) return s
              logs.unshift({ id: uid(), date, count: delta })
            } else {
              const next = Math.max(0, (logs[idx].count || 0) + delta)
              if (next === 0) logs.splice(idx, 1)
              else logs[idx] = { ...logs[idx], count: next }
            }
            const business = { ...s.business, salesLogs: logs }
            return { ...stamp(), ...withDmMetrics(s, business) }
          }),

        setBusinessGoals: (daily, weekly) =>
          set((s) => ({
            ...stamp(),
            business: {
              ...s.business,
              dmDailyGoal: daily || 20,
              dmWeeklyGoal: weekly || 140,
            },
          })),

        saveSnsWeek: (log) =>
          set((s) => {
            const weekStart = sundayOf(log.weekStart)
            const list = [...(s.business.snsLogs ?? [])]
            const payload: SnsWeekLog = {
              id: log.id || uid(),
              weekStart,
              instagram: { ...log.instagram },
              sales: { ...log.sales },
              notes: log.notes || '',
            }
            const idx = list.findIndex(
              (x) => x.id === payload.id || x.weekStart === weekStart,
            )
            if (idx >= 0) list[idx] = { ...payload, id: list[idx].id }
            else list.unshift(payload)
            return {
              ...stamp(),
              business: { ...s.business, snsLogs: list },
            }
          }),

        deleteSnsWeek: (id) =>
          set((s) => ({
            ...stamp(),
            business: {
              ...s.business,
              snsLogs: s.business.snsLogs.filter((x) => x.id !== id),
            },
          })),

        saveClient: (client) =>
          set((s) => {
            const list = [...s.business.clients]
            if (client.id) {
              const idx = list.findIndex((c) => c.id === client.id)
              const row: Client = {
                id: client.id,
                name: client.name.trim() || '無名',
                status: client.status,
                projectFee: client.projectFee || 0,
                recurringFee: client.recurringFee || 0,
                memo: client.memo || '',
                updatedAt: Date.now(),
              }
              if (idx >= 0) list[idx] = row
              else list.unshift(row)
            } else {
              list.unshift({
                id: uid(),
                name: client.name.trim() || '無名',
                status: client.status,
                projectFee: client.projectFee || 0,
                recurringFee: client.recurringFee || 0,
                memo: client.memo || '',
                updatedAt: Date.now(),
              })
            }
            return { ...stamp(), business: { ...s.business, clients: list } }
          }),

        deleteClient: (id) =>
          set((s) => ({
            ...stamp(),
            business: {
              ...s.business,
              clients: s.business.clients.filter((c) => c.id !== id),
            },
          })),

        saveIg: (entry) => {
          const instagramId = normalizeIgId(entry.instagramId)
          if (!instagramId) return 'Instagram IDを入力してください'
          const s = get()
          const dup = s.business.igList.find(
            (g) =>
              normalizeIgId(g.instagramId) === instagramId &&
              g.id !== entry.id,
          )
          if (dup) return '同じIDがすでにあります'
          const list = [...s.business.igList]
          if (entry.id) {
            const idx = list.findIndex((g) => g.id === entry.id)
            const row: IgEntry = {
              id: entry.id,
              instagramId,
              name: entry.name || '',
              memo: entry.memo || '',
              createdAt: idx >= 0 ? list[idx].createdAt : Date.now(),
            }
            if (idx >= 0) list[idx] = row
            else list.unshift(row)
          } else {
            list.unshift({
              id: uid(),
              instagramId,
              name: entry.name || '',
              memo: entry.memo || '',
              createdAt: Date.now(),
            })
          }
          set({ ...stamp(), business: { ...s.business, igList: list } })
          return null
        },

        deleteIg: (id) =>
          set((s) => ({
            ...stamp(),
            business: {
              ...s.business,
              igList: s.business.igList.filter((g) => g.id !== id),
            },
          })),

        saveDayWeight: (date, weight) =>
          set((s) => {
            const records = { ...s.body.records }
            const cur = records[date] ?? { weight: null, dailyCalories: null }
            records[date] = {
              ...cur,
              weight: Math.round(weight * 10) / 10,
            }
            const body = { ...s.body, records }
            return { ...stamp(), ...withBodyMetrics(s, body) }
          }),

        saveDayCalories: (date, calories) =>
          set((s) => {
            const records = { ...s.body.records }
            const cur = records[date] ?? { weight: null, dailyCalories: null }
            records[date] = {
              ...cur,
              dailyCalories: Math.max(0, Math.round(calories)),
            }
            const body = { ...s.body, records }
            return { ...stamp(), ...withBodyMetrics(s, body) }
          }),

        saveBodySettings: (settings) =>
          set((s) => ({
            ...stamp(),
            body: { ...s.body, settings: { ...s.body.settings, ...settings } },
          })),

        saveExercise: (ex) =>
          set((s) => {
            const list = [...s.body.exercises]
            const name = ex.name.trim().slice(0, 40)
            if (!name) return s
            if (ex.id) {
              const idx = list.findIndex((x) => x.id === ex.id)
              const row: Exercise = { id: ex.id, name, muscle: ex.muscle }
              if (idx >= 0) list[idx] = row
              else list.push(row)
            } else {
              list.push({ id: uid(), name, muscle: ex.muscle })
            }
            return { ...stamp(), body: { ...s.body, exercises: list } }
          }),

        deleteExercise: (id) =>
          set((s) => ({
            ...stamp(),
            body: {
              ...s.body,
              exercises: s.body.exercises.filter((e) => e.id !== id),
              workouts: s.body.workouts.map((w) => ({
                ...w,
                entries: w.entries.filter((e) => e.exerciseId !== id),
              })),
            },
          })),

        saveWorkout: (workout) =>
          set((s) => {
            const list = [...s.body.workouts]
            const row: Workout = {
              id: workout.id || uid(),
              date: workout.date,
              note: workout.note || '',
              entries: workout.entries,
            }
            const idx = list.findIndex((w) => w.date === row.date)
            if (idx >= 0) list[idx] = { ...row, id: list[idx].id }
            else list.unshift(row)
            return {
              ...stamp(),
              body: {
                ...s.body,
                workouts: list.sort((a, b) => b.date.localeCompare(a.date)),
              },
            }
          }),

        deleteWorkout: (date) =>
          set((s) => ({
            ...stamp(),
            body: {
              ...s.body,
              workouts: s.body.workouts.filter((w) => w.date !== date),
            },
          })),

        setAttendance: (courseId, sessionIndex, mark) =>
          set((s) => ({
            ...stamp(),
            university: {
              ...s.university,
              courses: s.university.courses.map((c) => {
                if (c.id !== courseId) return c
                const sessions = [...c.sessions]
                if (sessionIndex < 0 || sessionIndex >= sessions.length) return c
                sessions[sessionIndex] = mark
                return { ...c, sessions }
              }),
            },
          })),

        setActiveUniversityTerm: (termId) =>
          set((s) => ({
            ...stamp(),
            university: { ...s.university, activeTermId: termId },
          })),

        addUniversityCourse: (weekday, period, name) =>
          set((s) => {
            const trimmed = name.trim()
            if (!trimmed) return s
            const count = s.university.sessionCount || SESSION_COUNT
            const termId = s.university.activeTermId || 'y3_zenki'
            return {
              ...stamp(),
              university: {
                ...s.university,
                courses: [
                  ...s.university.courses,
                  {
                    id: uid(),
                    termId,
                    weekday,
                    period,
                    name: trimmed,
                    sessions: Array.from({ length: count }, () => null),
                  },
                ],
              },
            }
          }),

        deleteUniversityCourse: (courseId) =>
          set((s) => ({
            ...stamp(),
            university: {
              ...s.university,
              courses: s.university.courses.filter((c) => c.id !== courseId),
            },
          })),

        toggleDrivingItem: (sectionId, itemId) =>
          set((s) => ({
            ...stamp(),
            driving: {
              ...s.driving,
              sections: s.driving.sections.map((sec) =>
                sec.id !== sectionId
                  ? sec
                  : {
                      ...sec,
                      items: sec.items.map((it) =>
                        it.id === itemId ? { ...it, done: !it.done } : it,
                      ),
                    },
              ),
            },
          })),

        setDrivingDates: (dates) =>
          set((s) => ({
            ...stamp(),
            driving: {
              ...s.driving,
              ...(dates.startDate !== undefined
                ? { startDate: dates.startDate ? dates.startDate.slice(0, 10) : null }
                : {}),
              ...(dates.targetDate !== undefined
                ? { targetDate: dates.targetDate ? dates.targetDate.slice(0, 10) : null }
                : {}),
            },
          })),

        setSyncEnabled: (enabled) => {
          set((s) => ({
            sync: {
              ...s.sync,
              enabled,
              syncId: enabled ? ensureSyncId(s.sync.syncId) : s.sync.syncId,
              status: enabled ? 'idle' : 'offline',
              message: enabled ? '同期ON（自動で送受信します）' : '端末のみ',
            },
          }))
          if (enabled) {
            void get().syncNow()
          }
        },

        rotateSyncId: () =>
          set((s) => ({
            sync: {
              ...s.sync,
              syncId: issueNewSyncId(),
              message: '新しい同期IDを発行しました',
            },
          })),

        setSyncId: (id) => {
          const next = id.trim()
          const syncId = next ? ensureSyncId(next) : ''
          set((s) => ({
            sync: { ...s.sync, syncId, message: '同期IDを更新' },
          }))
          if (next && get().sync.enabled) {
            void get().syncNow()
          }
        },

        syncNow: async () => {
          if (syncInFlight) return syncInFlight
          syncInFlight = (async () => {
            const s = get()
            if (!s.sync.enabled) {
              set({ sync: { ...s.sync, status: 'offline', message: '同期がOFFです' } })
              return
            }
            const syncId = ensureSyncId(s.sync.syncId)
            set({
              sync: { ...s.sync, syncId, status: 'syncing', message: '同期中…' },
            })
            try {
              const remote = await pullRemote(syncId)
              const local: AppData = {
                version: 2,
                spaces: get().spaces,
                tasks: get().tasks,
                metrics: get().metrics,
                business: get().business,
                body: get().body,
                university: get().university,
                driving: get().driving,
                sync: get().sync,
                updatedAt: get().updatedAt,
              }
              if (remote && remote.updatedAt > local.updatedAt) {
                set({
                  ...remote,
                  version: 2,
                  business: remote.business ?? emptyBusiness(),
                  body: remote.body ? hydrateBody(remote.body) : emptyBody(),
                  university: remote.university
                    ? hydrateUniversity(remote.university)
                    : emptyUniversity(),
                  driving: remote.driving
                    ? hydrateDriving(remote.driving)
                    : emptyDriving(),
                  sync: {
                    ...get().sync,
                    syncId,
                    enabled: true,
                    status: 'idle',
                    lastPulledAt: Date.now(),
                    message: 'クラウドから取り込みました',
                  },
                  activeView: get().activeView,
                  activeSpaceId: get().activeSpaceId,
                })
              } else if (!remote || local.updatedAt > remote.updatedAt) {
                await pushRemote(syncId, { ...local, sync: { ...local.sync, syncId } })
                set((cur) => ({
                  sync: {
                    ...cur.sync,
                    syncId,
                    status: 'idle',
                    lastPushedAt: Date.now(),
                    message: 'クラウドへ保存しました',
                  },
                }))
              } else {
                set((cur) => ({
                  sync: {
                    ...cur.sync,
                    syncId,
                    status: 'idle',
                    message: '最新です',
                  },
                }))
              }
            } catch (e) {
              const msg = e instanceof Error ? e.message : '同期に失敗'
              set((cur) => ({
                sync: { ...cur.sync, status: 'error', message: msg },
              }))
            }
          })()
          try {
            await syncInFlight
          } finally {
            syncInFlight = null
          }
        },

        puterSignIn: async () => {
          set((s) => ({
            sync: { ...s.sync, status: 'syncing', message: 'Puter ログイン中…' },
          }))
          try {
            await signInPuter()
            const name = await getPuterUsername()
            set((s) => ({
              sync: {
                ...s.sync,
                status: 'idle',
                message: name ? `Puter ログイン済み（${name}）` : 'Puter ログイン済み',
              },
            }))
            if (get().sync.enabled) {
              await get().syncNow()
            }
          } catch (e) {
            const msg = e instanceof Error ? e.message : 'ログインに失敗'
            set((s) => ({
              sync: { ...s.sync, status: 'error', message: msg },
            }))
          }
        },

        puterSignOut: async () => {
          try {
            await signOutPuter()
            set((s) => ({
              sync: { ...s.sync, status: 'idle', message: 'Puter からログアウトしました' },
            }))
          } catch (e) {
            const msg = e instanceof Error ? e.message : 'ログアウトに失敗'
            set((s) => ({
              sync: { ...s.sync, status: 'error', message: msg },
            }))
          }
        },

        pushLocalOverwrite: async () => {
          const s = get()
          if (!s.sync.enabled) {
            set({ sync: { ...s.sync, status: 'offline', message: '先に同期ONにしてください' } })
            return
          }
          const syncId = ensureSyncId(s.sync.syncId)
          set({
            sync: { ...s.sync, syncId, status: 'syncing', message: 'この端末をクラウドへ上書き中…' },
          })
          try {
            const now = Date.now()
            const local: AppData = {
              version: 2,
              spaces: get().spaces,
              tasks: get().tasks,
              metrics: get().metrics,
              business: get().business,
              body: get().body,
              university: get().university,
              driving: get().driving,
              sync: { ...get().sync, syncId },
              updatedAt: now,
            }
            await pushRemote(syncId, local)
            set({
              updatedAt: now,
              sync: {
                ...get().sync,
                syncId,
                enabled: true,
                status: 'idle',
                lastPushedAt: now,
                message: 'この端末のデータをクラウドに上書きしました',
              },
            })
          } catch (e) {
            const msg = e instanceof Error ? e.message : '上書きに失敗'
            set((cur) => ({
              sync: { ...cur.sync, status: 'error', message: msg },
            }))
          }
        },

        pullRemoteOverwrite: async () => {
          const s = get()
          if (!s.sync.enabled) {
            set({ sync: { ...s.sync, status: 'offline', message: '先に同期ONにしてください' } })
            return
          }
          const syncId = ensureSyncId(s.sync.syncId)
          set({
            sync: { ...s.sync, syncId, status: 'syncing', message: 'クラウドから取り込み中…' },
          })
          try {
            const remote = await pullRemote(syncId)
            if (!remote) {
              set({
                sync: {
                  ...get().sync,
                  syncId,
                  status: 'error',
                  message:
                    'クラウドにデータがありません。先に片方の端末で「この端末をクラウドへ上書き」してください',
                },
              })
              return
            }
            set({
              ...remote,
              version: 2,
              business: remote.business ?? emptyBusiness(),
              body: remote.body ? hydrateBody(remote.body) : emptyBody(),
              university: remote.university
                ? hydrateUniversity(remote.university)
                : emptyUniversity(),
              driving: remote.driving
                ? hydrateDriving(remote.driving)
                : emptyDriving(),
              sync: {
                ...get().sync,
                syncId,
                enabled: true,
                status: 'idle',
                lastPulledAt: Date.now(),
                message: 'クラウドのデータをこの端末に取り込みました',
              },
              activeView: get().activeView,
              activeSpaceId: get().activeSpaceId,
            })
          } catch (e) {
            const msg = e instanceof Error ? e.message : '取り込みに失敗'
            set((cur) => ({
              sync: { ...cur.sync, status: 'error', message: msg },
            }))
          }
        },

        replaceData: (data) =>
          set({
            ...data,
            version: 2,
            business: data.business ?? emptyBusiness(),
            body: data.body ? hydrateBody(data.body) : emptyBody(),
            university: data.university
              ? hydrateUniversity(data.university)
              : emptyUniversity(),
            driving: data.driving ? hydrateDriving(data.driving) : emptyDriving(),
            activeView: 'home',
            activeSpaceId: null,
          }),

        exportJson: () => {
          const s = get()
          const payload: AppData = {
            version: 2,
            spaces: s.spaces,
            tasks: s.tasks,
            metrics: s.metrics,
            business: s.business,
            body: s.body,
            university: s.university,
            driving: s.driving,
            sync: s.sync,
            updatedAt: s.updatedAt,
          }
          return JSON.stringify(payload, null, 2)
        },
      }
    },
    {
      name: STORAGE_KEY,
      partialize: (s) => ({
        version: 2,
        spaces: s.spaces,
        tasks: s.tasks,
        metrics: s.metrics,
        business: s.business,
        body: s.body,
        university: s.university,
        driving: s.driving,
        sync: s.sync,
        updatedAt: s.updatedAt,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppData>
        const spaces = (Array.isArray(p.spaces) ? p.spaces : current.spaces).map((sp) => {
          if (sp.kind === 'business') return { ...sp, color: '#2563eb' }
          if (sp.kind === 'body') {
            const name =
              sp.name === 'ボディメイク' || sp.name === 'ボディ' ? '筋トレ' : sp.name
            return { ...sp, name, color: '#dc2626' }
          }
          if (sp.kind === 'university' || sp.key === 'university' || sp.name === '大学') {
            return { ...sp, kind: 'university' as const, color: '#16a34a', name: '大学' }
          }
          if (sp.kind === 'driving' || sp.key === 'driving' || sp.name === '自動車学校') {
            return {
              ...sp,
              kind: 'driving' as const,
              color: '#84cc16',
              name: '自動車学校',
            }
          }
          return sp
        })
        const business = mergeBusiness(
          p.business ? { ...emptyBusiness(), ...p.business } : current.business ?? emptyBusiness(),
          BAKED_BUSINESS,
        )
        const body = mergeBody(
          p.body ? hydrateBody(p.body) : current.body ?? emptyBody(),
          BAKED_BODY,
        )
        const university = mergeUniversity(
          p.university
            ? hydrateUniversity(p.university)
            : current.university ?? emptyUniversity(),
          BAKED_UNIVERSITY,
        )
        const driving = mergeDriving(
          p.driving ? hydrateDriving(p.driving) : current.driving ?? emptyDriving(),
          BAKED_DRIVING,
        )
        const tasks = Array.isArray(p.tasks) ? p.tasks : current.tasks
        const metrics = Array.isArray(p.metrics) ? p.metrics : current.metrics
        const ensured = ensureCoreSpaces({
          spaces,
          tasks,
          metrics,
          business,
          body,
        })
        return {
          ...current,
          ...p,
          version: 2,
          spaces: ensured.spaces,
          tasks: ensured.tasks,
          metrics: ensured.metrics,
          business,
          body,
          university,
          driving,
          sync: { ...current.sync, ...(p.sync ?? {}) },
        }
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return
        state.business = mergeBusiness(state.business ?? emptyBusiness(), BAKED_BUSINESS)
        state.body = mergeBody(state.body ? hydrateBody(state.body) : emptyBody(), BAKED_BODY)
        state.university = mergeUniversity(
          state.university ? hydrateUniversity(state.university) : emptyUniversity(),
          BAKED_UNIVERSITY,
        )
        state.driving = mergeDriving(
          state.driving ? hydrateDriving(state.driving) : emptyDriving(),
          BAKED_DRIVING,
        )
        const ensured = ensureCoreSpaces(state)
        state.spaces = ensured.spaces
        state.tasks = ensured.tasks
        state.metrics = ensured.metrics
        // updatedAt は触らない（起動のたびに「ローカルが最新」扱いになり同期が壊れるため）
      },
    },
  ),
)

export type { ClientStatus }
