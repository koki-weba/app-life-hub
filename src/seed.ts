import { format, subDays } from 'date-fns'
import type { AppData, MetricSeries, Space, Task } from './types'
import { emptyBusiness } from './business/helpers'
import { emptyBody } from './body/helpers'
import { uid } from './lib/id'

export { uid }

function spark(spaceId: string, key: string, label: string, base: number, jitter: number): MetricSeries {
  const points = Array.from({ length: 14 }, (_, i) => {
    const date = format(subDays(new Date(), 13 - i), 'yyyy-MM-dd')
    const wave = Math.sin(i / 2.2) * jitter
    return { date, value: Math.round((base + wave + i * (jitter * 0.08)) * 10) / 10 }
  })
  return { id: uid(), spaceId, key, label, points }
}

export function createSeedData(): AppData {
  const business: Space = {
    id: uid(),
    name: '起業',
    kind: 'business',
    color: '#2563eb',
    createdAt: Date.now(),
  }
  const bodySpace: Space = {
    id: uid(),
    name: '筋トレ',
    kind: 'body',
    color: '#dc2626',
    createdAt: Date.now(),
  }

  const tasks: Task[] = [
    {
      id: uid(),
      spaceId: business.id,
      title: 'DM 10件（探す≤30分）',
      scope: 'today',
      done: false,
      createdAt: Date.now(),
    },
    {
      id: uid(),
      spaceId: business.id,
      title: '返信は日程取りまで進める',
      scope: 'today',
      done: false,
      createdAt: Date.now(),
    },
    {
      id: uid(),
      spaceId: bodySpace.id,
      title: 'トレーニング or 歩数確保',
      scope: 'today',
      done: false,
      createdAt: Date.now(),
    },
    {
      id: uid(),
      spaceId: business.id,
      title: '週DM 80 / 商談 2',
      scope: 'week',
      done: false,
      createdAt: Date.now(),
    },
    {
      id: uid(),
      spaceId: bodySpace.id,
      title: '体重を3回以上記録',
      scope: 'week',
      done: false,
      createdAt: Date.now(),
    },
  ]

  return {
    version: 2,
    spaces: [business, bodySpace],
    tasks,
    metrics: [
      spark(business.id, 'dm', 'DM送信', 8, 4),
      spark(business.id, 'meetings', '商談', 0.4, 1.2),
      spark(bodySpace.id, 'weight', '体重 kg', 61.5, 0.8),
    ],
    business: emptyBusiness(),
    body: emptyBody(),
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
