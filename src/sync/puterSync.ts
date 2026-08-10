import type { AppData } from '../types'
import { emptyBusiness } from '../business/helpers'
import { emptyBody } from '../body/helpers'
import { emptyUniversity } from '../university/helpers'
import { emptyDriving } from '../driving/helpers'

declare global {
  interface Window {
    puter?: {
      auth?: {
        isSignedIn: () => boolean | Promise<boolean>
        signIn: (options?: {
          attempt_temp_user_creation?: boolean
          request_auth?: boolean
        }) => Promise<unknown>
        signOut?: () => void | Promise<void>
        getUser?: () => Promise<{ username?: string; email?: string } | null>
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

/** 必ず新しい同期IDを発行する（既存IDの再利用はしない） */
export function issueNewSyncId() {
  const id = generateSyncId()
  localStorage.setItem(SYNC_ID_KEY, id)
  return id
}

function kvKey(syncId: string) {
  return `lifehub_cloud_v1_${syncId}`
}

export async function waitForPuter(timeoutMs = 12000) {
  const start = Date.now()
  while (!window.puter?.auth || !window.puter?.kv) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(
        'Puter が読み込めていません。ネット接続を確認し、ページを再読み込みしてください',
      )
    }
    await new Promise((r) => setTimeout(r, 40))
  }
}

function authErrorMessage(e: unknown): string {
  if (!e || typeof e !== 'object') {
    return e instanceof Error ? e.message : 'Puter ログインに失敗しました'
  }
  const err = e as { error?: string; msg?: string; message?: string }
  if (err.error === 'popup_blocked') {
    return 'ログイン用ポップアップがブロックされました。ブラウザで開いている場合は許可するか、ホーム画面アプリではなく Chrome / Safari のタブで開いて再度「Puterにログイン」を押してください'
  }
  if (err.error === 'auth_window_closed') {
    return 'ログインがキャンセルされました。もう一度「Puterにログイン」を押してください'
  }
  return err.msg || err.message || 'Puter ログインに失敗しました'
}

/** ユーザー操作（ボタン）からのみ呼ぶこと（ポップアップのため） */
export async function signInPuter() {
  await waitForPuter()
  try {
    await window.puter!.auth!.signIn()
  } catch (e) {
    throw new Error(authErrorMessage(e))
  }
}

export async function signOutPuter() {
  await waitForPuter()
  const fn = window.puter!.auth!.signOut
  if (fn) await fn()
}

export async function getPuterSignedIn(): Promise<boolean> {
  try {
    await waitForPuter(4000)
    const v = window.puter!.auth!.isSignedIn()
    return !!(await Promise.resolve(v))
  } catch {
    return false
  }
}

export async function getPuterUsername(): Promise<string | null> {
  try {
    if (!(await getPuterSignedIn())) return null
    const user = await window.puter!.auth!.getUser?.()
    return user?.username || user?.email || null
  } catch {
    return null
  }
}

async function ensurePuterReady() {
  await waitForPuter()
  const signed = await getPuterSignedIn()
  if (!signed) {
    throw new Error(
      'Puter に未ログインです。設定の「Puterにログイン」を押してから同期してください',
    )
  }
}

function parseRemote(raw: unknown): AppData | null {
  if (!raw) return null
  const text = typeof raw === 'string' ? raw : JSON.stringify(raw)
  const parsed = JSON.parse(text) as Partial<AppData>
  if (!parsed || typeof parsed !== 'object') return null
  const ver = Number(parsed.version)
  if (ver !== 1 && ver !== 2) return null
  return {
    version: 2 as const,
    spaces: parsed.spaces ?? [],
    tasks: parsed.tasks ?? [],
    metrics: parsed.metrics ?? [],
    business: parsed.business ?? emptyBusiness(),
    body: parsed.body ?? emptyBody(),
    university: parsed.university ?? emptyUniversity(),
    driving: parsed.driving ?? emptyDriving(),
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

export async function pullRemote(syncId: string): Promise<AppData | null> {
  await ensurePuterReady()
  const raw = await window.puter!.kv!.get(kvKey(syncId))
  return parseRemote(raw)
}

export async function pushRemote(syncId: string, data: AppData) {
  await ensurePuterReady()
  await window.puter!.kv!.set(kvKey(syncId), JSON.stringify(data))
}
