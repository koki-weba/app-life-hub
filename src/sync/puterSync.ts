import type { AppData } from '../types'

declare global {
  interface Window {
    puter?: {
      auth?: {
        isSignedIn: () => boolean | Promise<boolean>
        signIn: () => Promise<unknown>
      }
      kv?: {
        get: (key: string) => Promise<unknown>
        set: (key: string, value: string) => Promise<unknown>
      }
    }
  }
}

const SYNC_ID_KEY = 'lifeHub_syncId_v1'

function generateSyncId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let s = ''
  for (let i = 0; i < 20; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

export function ensureSyncId(current: string) {
  let id = (current || localStorage.getItem(SYNC_ID_KEY) || '').trim()
  if (!id) id = generateSyncId()
  localStorage.setItem(SYNC_ID_KEY, id)
  return id
}

function kvKey(syncId: string) {
  return `lifehub_cloud_v1_${syncId}`
}

async function ensurePuterLogin() {
  const puter = window.puter
  if (!puter?.kv) {
    throw new Error('Puter が読み込めていません。ネット接続を確認してください')
  }
  const signed =
    typeof puter.auth?.isSignedIn === 'function'
      ? await puter.auth.isSignedIn()
      : false
  if (!signed && puter.auth?.signIn) {
    await puter.auth.signIn()
  }
}

export async function pullRemote(syncId: string): Promise<AppData | null> {
  await ensurePuterLogin()
  const raw = await window.puter!.kv!.get(kvKey(syncId))
  if (!raw) return null
  const text = typeof raw === 'string' ? raw : JSON.stringify(raw)
  const parsed = JSON.parse(text) as {
    version?: number
    business?: AppData['business']
    body?: AppData['body']
    spaces?: AppData['spaces']
    tasks?: AppData['tasks']
    metrics?: AppData['metrics']
    sync?: AppData['sync']
    updatedAt?: number
  }
  if (!parsed || typeof parsed !== 'object') return null
  const ver = Number(parsed.version)
  if (ver !== 1 && ver !== 2) return null
  return {
    version: 2 as const,
    spaces: parsed.spaces ?? [],
    tasks: parsed.tasks ?? [],
    metrics: parsed.metrics ?? [],
    business: parsed.business ?? {
      dmDailyGoal: 10,
      dmWeeklyGoal: 80,
      salesLogs: [],
      snsLogs: [],
      clients: [],
      igList: [],
    },
    body: parsed.body ?? {
      settings: {
        height: null,
        startWeight: null,
        targetWeight: null,
        targetDate: null,
        dailyCalGoal: 2000,
      },
      records: {},
      exercises: [],
      workouts: [],
    },
    sync: parsed.sync ?? {
      enabled: false,
      syncId: '',
      lastPulledAt: null,
      lastPushedAt: null,
      status: 'idle' as const,
    },
    updatedAt: parsed.updatedAt ?? Date.now(),
  }
}

export async function pushRemote(syncId: string, data: AppData) {
  await ensurePuterLogin()
  await window.puter!.kv!.set(kvKey(syncId), JSON.stringify(data))
}
