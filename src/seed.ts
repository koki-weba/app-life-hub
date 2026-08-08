import type { AppData, Task } from './types'
import { mergeBusiness, syncDmMetricPoints } from './business/helpers'
import { emptyBusiness } from './business/helpers'
import { emptyBody, mergeBody, syncBodyMetricPoints } from './body/helpers'
import { createDefaultSpaces } from './lib/ensureCoreSpaces'
import { BAKED_BODY, BAKED_BUSINESS } from './data/bakedLegacy'
import { uid } from './lib/id'

export { uid }

export function createSeedData(): AppData {
  const spaces = createDefaultSpaces()
  const businessSpace = spaces.find((s) => s.key === 'business')!
  const bodySpace = spaces.find((s) => s.key === 'body')!

  const business = mergeBusiness(emptyBusiness(), BAKED_BUSINESS)
  const body = mergeBody(emptyBody(), BAKED_BODY)

  const tasks: Task[] = [
    {
      id: uid(),
      spaceId: businessSpace.id,
      title: 'DM 10件（探す≤30分）',
      scope: 'today',
      done: false,
      createdAt: Date.now(),
    },
    {
      id: uid(),
      spaceId: businessSpace.id,
      title: '返信は日程取りまで進める',
      scope: 'today',
      done: false,
      createdAt: Date.now(),
    },
    {
      id: uid(),
      spaceId: businessSpace.id,
      title: '週DM 80 / 商談 2',
      scope: 'week',
      done: false,
      createdAt: Date.now(),
    },
  ]

  let metrics = syncDmMetricPoints(business, [], businessSpace.id)
  metrics = syncBodyMetricPoints(body, metrics, bodySpace.id)

  return {
    version: 2,
    spaces,
    tasks,
    metrics,
    business,
    body,
    sync: {
      enabled: false,
      syncId: '',
      lastPulledAt: null,
      lastPushedAt: null,
      status: 'idle',
    },
    updatedAt: Date.now(),
  }
}
