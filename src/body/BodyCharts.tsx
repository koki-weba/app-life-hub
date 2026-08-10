import { useMemo, useState, type ReactNode } from 'react'
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
import { MUSCLE_LABELS, todayStr, workoutVolume } from './helpers'

type RangeKey = '7d' | '30d' | '90d' | '180d' | '365d' | 'all'

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: '7d', label: '7日' },
  { key: '30d', label: '30日' },
  { key: '90d', label: '90日' },
  { key: '180d', label: '180日' },
  { key: '365d', label: '365日' },
  { key: 'all', label: '全期間' },
]

const DAILY_ORANGE = '#f97316'
const AVG_PURPLE = '#6366f1'
const VOLUME_TEAL = '#14b8a6'

function rangeStart(range: RangeKey, today: string, earliest: string | null) {
  if (range === 'all') return earliest
  const days =
    range === '7d'
      ? 6
      : range === '30d'
        ? 29
        : range === '90d'
          ? 89
          : range === '180d'
            ? 179
            : 364
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

function rolling7(byDate: Map<string, number>, day: string): number | null {
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
  byDate: Map<string, number>,
  range: RangeKey,
  today: string,
) {
  const dates = [...byDate.keys()].sort()
  if (dates.length === 0) return []

  const start = rangeStart(range, today, dates[0])
  if (!start) return []
  const from = start > dates[0] && range !== 'all' ? start : dates[0]
  const end = today < dates[dates.length - 1] ? dates[dates.length - 1] : today
  const chartEnd = range === 'all' ? dates[dates.length - 1] : end
  const chartStart = from > chartEnd ? chartEnd : from
  const showAvg = range !== '7d'

  return eachDay(chartStart, chartEnd).map((date) => {
    const daily = byDate.has(date) ? byDate.get(date)! : null
    const avg = showAvg ? rolling7(byDate, date) : null
    const label =
      range === '7d' || range === '30d' || range === '90d'
        ? date.slice(5).replace('-', '/')
        : date.slice(2)
    return {
      date: label,
      fullDate: date,
      daily: daily as number | null,
      avg7: avg,
    }
  })
}

function trendBadge(
  data: { daily: number | null }[],
): { text: string; tone: 'ok' | 'empty' | 'up' | 'down' } {
  const vals = data.map((d) => d.daily).filter((v): v is number => v != null)
  if (vals.length < 2) return { text: 'データ不足', tone: 'empty' }
  const first = vals[0]
  const last = vals[vals.length - 1]
  const diff = last - first
  if (Math.abs(diff) < 0.05) return { text: '横ばい', tone: 'ok' }
  if (diff > 0) return { text: `+${diff.toFixed(1)}`, tone: 'up' }
  return { text: diff.toFixed(1), tone: 'down' }
}

function ChartBlock({
  title,
  unit,
  data,
  color,
  showAvg,
  extra,
}: {
  title: string
  unit: string
  data: { date: string; daily: number | null; avg7: number | null }[]
  color: string
  showAvg: boolean
  extra?: ReactNode
}) {
  const badge = trendBadge(data)
  const hasPoints = data.some((d) => d.daily != null)

  return (
    <section className="body-card">
      <div className="body-card-head">
        <h3>{title}</h3>
        <span className={`body-trend body-trend--${badge.tone}`}>{badge.text}</span>
      </div>
      {extra}
      {!hasPoints ? (
        <div className="body-chart-empty">まだデータがありません</div>
      ) : (
        <div className="body-chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid stroke="rgba(15,23,42,0.06)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                interval="preserveStartEnd"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                width={40}
                domain={['auto', 'auto']}
                axisLine={false}
                tickLine={false}
              />
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
                stroke={color}
                strokeWidth={2.2}
                dot={false}
                connectNulls={false}
                animationDuration={500}
              />
              {showAvg ? (
                <Line
                  type="linear"
                  dataKey="avg7"
                  name="avg7"
                  stroke={AVG_PURPLE}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  animationDuration={500}
                />
              ) : null}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}

export function BodyCharts() {
  const body = useHub((s) => s.body)
  const [range, setRange] = useState<RangeKey>('30d')
  const [exerciseId, setExerciseId] = useState(body.exercises[0]?.id ?? '')
  const today = todayStr()
  const showAvg = range !== '7d'

  const weightByDate = useMemo(() => {
    const m = new Map<string, number>()
    for (const [date, rec] of Object.entries(body.records)) {
      if (rec.weight != null) m.set(date, rec.weight)
    }
    return m
  }, [body.records])

  const calByDate = useMemo(() => {
    const m = new Map<string, number>()
    for (const [date, rec] of Object.entries(body.records)) {
      if (rec.dailyCalories != null) m.set(date, rec.dailyCalories)
    }
    return m
  }, [body.records])

  const volumeByDate = useMemo(() => {
    const m = new Map<string, number>()
    for (const w of body.workouts) {
      m.set(w.date, Math.round(workoutVolume(w)))
    }
    return m
  }, [body.workouts])

  const exerciseByDate = useMemo(() => {
    const m = new Map<string, number>()
    const id = exerciseId || body.exercises[0]?.id
    if (!id) return m
    for (const w of body.workouts) {
      const entry = w.entries.find((e) => e.exerciseId === id)
      if (!entry?.sets.length) continue
      const maxW = Math.max(...entry.sets.map((s) => s.weight))
      m.set(w.date, maxW)
    }
    return m
  }, [body.workouts, body.exercises, exerciseId])

  const weightData = useMemo(
    () => buildSeries(weightByDate, range, today),
    [weightByDate, range, today],
  )
  const calorieData = useMemo(
    () => buildSeries(calByDate, range, today),
    [calByDate, range, today],
  )
  const volumeData = useMemo(
    () => buildSeries(volumeByDate, range, today),
    [volumeByDate, range, today],
  )
  const exerciseData = useMemo(
    () => buildSeries(exerciseByDate, range, today),
    [exerciseByDate, range, today],
  )

  return (
    <div className="body-charts">
      <div className="body-seg body-seg--scroll">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            className={`body-seg-btn${range === opt.key ? ' is-active' : ''}`}
            onClick={() => setRange(opt.key)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <ChartBlock
        title="体重の推移"
        unit="kg"
        data={weightData}
        color={DAILY_ORANGE}
        showAvg={showAvg}
      />
      <ChartBlock
        title="カロリーの推移"
        unit="kcal"
        data={calorieData}
        color={DAILY_ORANGE}
        showAvg={showAvg}
      />
      <ChartBlock
        title="総ボリュームの推移"
        unit="kg"
        data={volumeData}
        color={VOLUME_TEAL}
        showAvg={false}
      />
      <ChartBlock
        title="種目別重量の推移"
        unit="kg"
        data={exerciseData}
        color={AVG_PURPLE}
        showAvg={false}
        extra={
          <label className="body-field body-chart-ex">
            <span>種目</span>
            <select
              className="body-input"
              value={exerciseId || body.exercises[0]?.id || ''}
              onChange={(e) => setExerciseId(e.target.value)}
            >
              {body.exercises.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}（{MUSCLE_LABELS[ex.muscle]}）
                </option>
              ))}
            </select>
          </label>
        }
      />

      <p className="body-chart-hint">
        1週間の平均線は30日以上の表示で利用できます
      </p>
    </div>
  )
}
