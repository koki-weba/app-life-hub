import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { addDays, format, parseISO, subDays } from 'date-fns'
import { useHub } from '../store'
import { todayStr } from './helpers'

type RangeKey = '7d' | '30d' | '90d' | '365d' | 'all'

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: '7d', label: '1週間' },
  { key: '30d', label: '1ヶ月' },
  { key: '90d', label: '90日' },
  { key: '365d', label: '1年' },
  { key: 'all', label: '全期間' },
]

const DAILY_ORANGE = '#f97316'

function rangeStart(range: RangeKey, today: string, earliest: string | null) {
  if (range === 'all') return earliest
  const days =
    range === '7d' ? 6 : range === '30d' ? 29 : range === '90d' ? 89 : 364
  return format(subDays(parseISO(today), days), 'yyyy-MM-dd')
}

function eachDay(start: string, end: string) {
  const out: string[] = []
  let cur = parseISO(start)
  const last = parseISO(end)
  while (cur <= last) {
    out.push(format(cur, 'yyyy-MM-dd'))
    cur = addDays(cur, 1)
  }
  return out
}

function rolling7(
  byDate: Map<string, number>,
  day: string,
): number | null {
  const end = parseISO(day)
  const vals: number[] = []
  for (let i = 0; i < 7; i++) {
    const d = format(subDays(end, i), 'yyyy-MM-dd')
    const v = byDate.get(d)
    if (v != null) vals.push(v)
  }
  if (vals.length === 0) return null
  return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10
}

function buildSeries(
  records: Record<string, { weight: number | null; dailyCalories: number | null }>,
  field: 'weight' | 'dailyCalories',
  range: RangeKey,
  today: string,
) {
  const byDate = new Map<string, number>()
  for (const [date, rec] of Object.entries(records)) {
    const v = rec[field]
    if (v != null) byDate.set(date, v)
  }
  const dates = [...byDate.keys()].sort()
  if (dates.length === 0) return []

  const start = rangeStart(range, today, dates[0])
  if (!start) return []
  const from = start > dates[0] && range !== 'all' ? start : dates[0]
  const end = today < dates[dates.length - 1] ? dates[dates.length - 1] : today
  const chartEnd = range === 'all' ? dates[dates.length - 1] : end
  const chartStart = from > chartEnd ? chartEnd : from

  return eachDay(chartStart, chartEnd).map((date) => {
    const daily = byDate.has(date) ? byDate.get(date)! : null
    const avg = rolling7(byDate, date)
    const label =
      range === '7d' || range === '30d' || range === '90d'
        ? date.slice(5)
        : date.slice(2) // YY-MM-DD compact
    return {
      date: label,
      fullDate: date,
      daily: daily as number | null,
      avg7: avg,
    }
  })
}

function ChartBlock({
  title,
  unit,
  data,
  color,
}: {
  title: string
  unit: string
  data: { date: string; daily: number | null; avg7: number | null }[]
  color: string
}) {
  if (data.length === 0) {
    return (
      <section className="panel">
        <h2>{title}</h2>
        <div className="empty">まだデータがありません</div>
      </section>
    )
  }

  return (
    <section className="panel">
      <h2>{title}</h2>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="rgba(26,46,42,0.08)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#5d6f6a' }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11, fill: '#5d6f6a' }} width={40} domain={['auto', 'auto']} />
            <Tooltip
              formatter={(value, name) => {
                const n = typeof value === 'number' ? value : Number(value)
                const label = name === 'daily' ? '日次' : '7日平均'
                return [`${Number.isFinite(n) ? n : '—'} ${unit}`, label]
              }}
            />
            <Line
              type="linear"
              dataKey="daily"
              name="daily"
              stroke={DAILY_ORANGE}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              animationDuration={500}
            />
            <Line
              type="linear"
              dataKey="avg7"
              name="avg7"
              stroke={color}
              strokeWidth={2.2}
              dot={false}
              connectNulls
              animationDuration={500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

export function BodyCharts() {
  const body = useHub((s) => s.body)
  const [range, setRange] = useState<RangeKey>('30d')
  const today = todayStr()
  const brand = '#dc2626'

  const weightData = useMemo(
    () => buildSeries(body.records, 'weight', range, today),
    [body.records, range, today],
  )
  const calorieData = useMemo(
    () => buildSeries(body.records, 'dailyCalories', range, today),
    [body.records, range, today],
  )

  return (
    <div className="body-charts">
      <div className="biz-tabs" style={{ marginBottom: '0.75rem' }}>
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            className={`btn sm ${range === opt.key ? '' : 'ghost'}`}
            onClick={() => setRange(opt.key)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <ChartBlock title="体重の推移" unit="kg" data={weightData} color={brand} />
      <ChartBlock title="カロリーの推移" unit="kcal" data={calorieData} color={brand} />
    </div>
  )
}
