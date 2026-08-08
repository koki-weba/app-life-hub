import weightRaw from './weight-tracker-2026-08-08.json'
import businessRaw from './startup-roadmap-backup-2026-08-08.json'
import { extractBusinessFromLegacy } from '../business/helpers'
import { extractBodyFromLegacy } from '../body/helpers'
import type { BodyData, BusinessData } from '../types'

/** ユーザー提供の旧アプリJSONを変換した固定データ */
export const BAKED_BUSINESS: BusinessData = extractBusinessFromLegacy(
  businessRaw as unknown as Record<string, unknown>,
)

export const BAKED_BODY: BodyData = extractBodyFromLegacy(
  weightRaw as unknown as Record<string, unknown>,
)
