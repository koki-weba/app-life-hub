import { AnimatePresence, Reorder, motion } from 'framer-motion'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Component, useEffect, useMemo, useState, type ErrorInfo, type ReactNode } from 'react'
import { BusinessPanel } from './business/BusinessPanel'
import { BodyPanel } from './body/BodyPanel'
import { useHub } from './store'
import { ensureCoreSpaces, isLockedSpace } from './lib/ensureCoreSpaces'
import type { SpaceKind, TaskScope } from './types'
import './index.css'

const pageMotion = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
}

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: string | null }
> {
  state = { error: null as string | null }
  static getDerivedStateFromError(err: Error) {
    return { error: err.message || '表示エラー' }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info)
  }
  render() {
    if (this.state.error) {
      return (
        <div className="app-shell">
          <div className="panel">
            <h2>表示に失敗しました</h2>
            <p className="muted small">{this.state.error}</p>
            <button
              type="button"
              className="btn"
              onClick={() => {
                localStorage.removeItem('lifeHub_data_v1')
                location.reload()
              }}
            >
              データを初期化して再読み込み
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function spaceMap(spaces: { id: string; name: string; color: string }[]) {
  return Object.fromEntries(spaces.map((s) => [s.id, s]))
}

function HomeView() {
  const spacesAll = useHub((s) => s.spaces)
  const tasks = useHub((s) => s.tasks)
  const toggleTask = useHub((s) => s.toggleTask)

  const spaces = useMemo(
    () => (spacesAll ?? []).filter((x) => !x.archived),
    [spacesAll],
  )
  const map = useMemo(() => spaceMap(spaces), [spaces])
  const today = useMemo(
    () => (tasks ?? []).filter((t) => t.scope === 'today' && map[t.spaceId]),
    [tasks, map],
  )
  const week = useMemo(
    () => (tasks ?? []).filter((t) => t.scope === 'week' && map[t.spaceId]),
    [tasks, map],
  )

  return (
    <motion.div {...pageMotion}>
      <section className="panel">
        <h2>今日のタスク</h2>
        {today.length === 0 ? (
          <div className="empty">今日のタスクはまだありません</div>
        ) : (
          <div className="task-list">
            {today.map((t, i) => (
              <motion.div
                key={t.id}
                className="task-item"
                data-done={t.done}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <button
                  type="button"
                  className="task-check"
                  data-on={t.done}
                  aria-label="完了切替"
                  onClick={() => toggleTask(t.id)}
                />
                <span className="task-title">{t.title}</span>
                <span
                  className="space-tag"
                  style={{ background: map[t.spaceId]?.color }}
                >
                  {map[t.spaceId]?.name}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <h2>今週のタスク</h2>
        {week.length === 0 ? (
          <div className="empty">今週のタスクはまだありません</div>
        ) : (
          <div className="task-list">
            {week.map((t) => (
              <div key={t.id} className="task-item" data-done={t.done}>
                <button
                  type="button"
                  className="task-check"
                  data-on={t.done}
                  aria-label="完了切替"
                  onClick={() => toggleTask(t.id)}
                />
                <span className="task-title">{t.title}</span>
                <span
                  className="space-tag"
                  style={{ background: map[t.spaceId]?.color }}
                >
                  {map[t.spaceId]?.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </motion.div>
  )
}

function SpaceView({ spaceId }: { spaceId: string }) {
  const spaces = useHub((s) => s.spaces)
  const tasksAll = useHub((s) => s.tasks)
  const metricsAll = useHub((s) => s.metrics)
  const toggleTask = useHub((s) => s.toggleTask)
  const addTask = useHub((s) => s.addTask)
  const addMetricPoint = useHub((s) => s.addMetricPoint)
  const [title, setTitle] = useState('')
  const [scope, setScope] = useState<TaskScope>('today')
  const [metricValue, setMetricValue] = useState('')

  const space = useMemo(
    () => (spaces ?? []).find((x) => x.id === spaceId),
    [spaces, spaceId],
  )
  const tasks = useMemo(
    () => (tasksAll ?? []).filter((t) => t.spaceId === spaceId),
    [tasksAll, spaceId],
  )
  const metrics = useMemo(
    () => (metricsAll ?? []).filter((m) => m.spaceId === spaceId),
    [metricsAll, spaceId],
  )

  const chartData = useMemo(() => {
    if (metrics.length === 0) return []
    const dates = new Set<string>()
    metrics.forEach((m) => m.points?.forEach((p) => dates.add(p.date)))
    const sorted = [...dates].sort()
    return sorted.map((date) => {
      const row: Record<string, string | number> = { date: date.slice(5) }
      metrics.forEach((m) => {
        const pt = m.points?.find((p) => p.date === date)
        if (pt) row[m.label] = pt.value
      })
      return row
    })
  }, [metrics])

  if (!space) return <div className="empty">項目が見つかりません</div>

  return (
    <motion.div {...pageMotion}>
      {space.temporary ? (
        <section className="panel">
          <h2 style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
            <span>{space.name}</span>
            <span className="muted small">一時項目</span>
          </h2>
        </section>
      ) : null}

      {space.kind === 'business' ? <BusinessPanel /> : null}
      {space.kind === 'body' ? <BodyPanel /> : null}

      <section className="panel">
        <h2>タスク</h2>
        <div className="task-list" style={{ marginBottom: '0.8rem' }}>
          {tasks.map((t) => (
            <div key={t.id} className="task-item" data-done={t.done}>
              <button
                type="button"
                className="task-check"
                data-on={t.done}
                onClick={() => toggleTask(t.id)}
              />
              <span className="task-title">
                {t.title}
                <span className="muted small"> · {t.scope === 'today' ? '今日' : '今週'}</span>
              </span>
              <span />
            </div>
          ))}
        </div>
        <label className="field">
          <span>追加</span>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="タスク内容"
          />
        </label>
        <div className="row">
          <button
            type="button"
            className={`btn sm ${scope === 'today' ? '' : 'ghost'}`}
            onClick={() => setScope('today')}
          >
            今日
          </button>
          <button
            type="button"
            className={`btn sm ${scope === 'week' ? '' : 'ghost'}`}
            onClick={() => setScope('week')}
          >
            今週
          </button>
          <button
            type="button"
            className="btn sm"
            onClick={() => {
              addTask(space.id, title, scope)
              setTitle('')
            }}
          >
            追加
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>数値</h2>
        {metrics.map((m) => {
          const last = m.points?.[m.points.length - 1]
          return (
            <div key={m.id} className="metric-card">
              <div>
                <div className="muted small">{m.label}</div>
                <strong>{last ? last.value : '—'}</strong>
              </div>
              <div className="row">
                <input
                  className="input"
                  style={{ width: '5.5rem' }}
                  inputMode="decimal"
                  placeholder="値"
                  value={metricValue}
                  onChange={(e) => setMetricValue(e.target.value)}
                />
                <button
                  type="button"
                  className="btn sm ghost"
                  onClick={() => {
                    const v = Number(metricValue)
                    if (!Number.isFinite(v)) return
                    addMetricPoint(m.id, v)
                    setMetricValue('')
                  }}
                >
                  記録
                </button>
              </div>
            </div>
          )
        })}
        {metrics.length === 0 ? (
          <div className="empty">この項目のメトリクスはまだありません</div>
        ) : null}
      </section>

      {chartData.length > 0 ? (
        <section className="panel">
          <h2>推移</h2>
          <p className="muted small" style={{ marginTop: '-0.35rem', marginBottom: '0.7rem' }}>
            {metrics.map((m) => m.label).join(' · ')}
          </p>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke="rgba(26,46,42,0.08)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#5d6f6a' }} />
                <YAxis tick={{ fontSize: 11, fill: '#5d6f6a' }} width={36} />
                <Tooltip />
                {metrics.length > 1 ? <Legend /> : null}
                {metrics.map((m, i) => (
                  <Line
                    key={m.id}
                    type="monotone"
                    dataKey={m.label}
                    stroke={space.color || '#0f172a'}
                    strokeWidth={2.4}
                    strokeOpacity={1 - i * 0.25}
                    dot={false}
                    animationDuration={700}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      ) : null}
    </motion.div>
  )
}

function SettingsView() {
  const sync = useHub((s) => s.sync)
  const spacesAll = useHub((s) => s.spaces)
  const addSpace = useHub((s) => s.addSpace)
  const removeSpace = useHub((s) => s.removeSpace)
  const setSyncEnabled = useHub((s) => s.setSyncEnabled)
  const setSyncId = useHub((s) => s.setSyncId)
  const rotateSyncId = useHub((s) => s.rotateSyncId)
  const syncNow = useHub((s) => s.syncNow)
  const exportJson = useHub((s) => s.exportJson)
  const replaceData = useHub((s) => s.replaceData)
  const importLegacyBusiness = useHub((s) => s.importLegacyBusiness)
  const importLegacyBody = useHub((s) => s.importLegacyBody)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<SpaceKind>('custom')
  const [temporary, setTemporary] = useState(true)
  const [syncIdDraft, setSyncIdDraft] = useState(sync.syncId)
  const [importMsg, setImportMsg] = useState('')

  const spaces = useMemo(
    () => (spacesAll ?? []).filter((x) => !x.archived),
    [spacesAll],
  )

  return (
    <motion.div {...pageMotion}>
      <section className="panel">
        <h2>項目一覧</h2>
        <p className="muted small" style={{ marginTop: '-0.35rem', marginBottom: '0.75rem' }}>
          追加・削除はこの設定画面でのみ行えます。起業・大学・筋トレ・趣味・自動車学校は削除できません。
        </p>
        <div className="task-list">
          {spaces.map((sp) => {
            const locked = isLockedSpace(sp)
            return (
              <div key={sp.id} className="task-item">
                <span
                  className="space-tag"
                  style={{ background: sp.color, marginRight: '0.35rem' }}
                >
                  {sp.name}
                </span>
                <span className="task-title">
                  {sp.temporary ? (
                    <span className="muted small">一時項目</span>
                  ) : locked ? (
                    <span className="muted small">固定</span>
                  ) : (
                    <span className="muted small">その他</span>
                  )}
                </span>
                {locked ? (
                  <span className="muted small">削除不可</span>
                ) : (
                  <button
                    type="button"
                    className="btn sm danger ghost"
                    onClick={() => {
                      if (confirm(`「${sp.name}」を削除しますか？`)) removeSpace(sp.id)
                    }}
                  >
                    削除
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section className="panel">
        <h2>項目を追加</h2>
        <p className="muted small" style={{ marginTop: '-0.35rem', marginBottom: '0.75rem' }}>
          数ヶ月だけの一時項目も追加できます。下部ナビはドラッグで並べ替えできます。
        </p>
        <label className="field">
          <span>名前</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 学校祭 / 旅行準備"
          />
        </label>
        <div className="row" style={{ marginBottom: '0.7rem' }}>
          {(
            [
              ['custom', 'その他'],
              ['business', '起業'],
              ['body', '筋トレ'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={`btn sm ${kind === k ? '' : 'ghost'}`}
              onClick={() => setKind(k)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="row" style={{ alignItems: 'center', marginBottom: '0.8rem' }}>
          <input
            type="checkbox"
            checked={temporary}
            onChange={(e) => setTemporary(e.target.checked)}
          />
          <span className="small">一時項目として追加</span>
        </label>
        <button
          type="button"
          className="btn"
          onClick={() => {
            addSpace(name, kind, temporary)
            setName('')
          }}
        >
          追加する
        </button>
      </section>

      <section className="panel">
        <h2>スマホ ↔ PC 同期</h2>
        <p className="muted small" style={{ marginTop: '-0.35rem', marginBottom: '0.75rem' }}>
          起業アプリと同様、Puter アカウント + 同じ同期IDで共有します。PWAとしてホーム画面追加も可能です。
        </p>
        <div className="row" style={{ marginBottom: '0.75rem' }}>
          <button
            type="button"
            className={`btn sm ${sync.enabled ? '' : 'ghost'}`}
            onClick={() => setSyncEnabled(true)}
          >
            同期ON
          </button>
          <button
            type="button"
            className={`btn sm ${!sync.enabled ? '' : 'ghost'}`}
            onClick={() => setSyncEnabled(false)}
          >
            同期OFF
          </button>
          <button type="button" className="btn sm ghost" onClick={() => syncNow()}>
            今すぐ同期
          </button>
        </div>
        <label className="field">
          <span>同期ID（両端末で同じ）</span>
          <input
            className="input"
            value={syncIdDraft}
            onChange={(e) => setSyncIdDraft(e.target.value)}
            onBlur={() => setSyncId(syncIdDraft)}
          />
        </label>
        <div className="row">
          <button
            type="button"
            className="btn sm ghost"
            onClick={() => {
              rotateSyncId()
              setSyncIdDraft(useHub.getState().sync.syncId)
            }}
          >
            IDを新規発行
          </button>
          <button
            type="button"
            className="btn sm ghost"
            onClick={async () => {
              await navigator.clipboard.writeText(sync.syncId || syncIdDraft)
            }}
          >
            IDをコピー
          </button>
        </div>
        <p className="muted small" style={{ marginTop: '0.75rem' }}>
          状態: {sync.status} {sync.message ? `· ${sync.message}` : ''}
        </p>
      </section>

      <section className="panel">
        <h2>バックアップ</h2>
        <div className="row">
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => {
              const blob = new Blob([exportJson()], { type: 'application/json' })
              const a = document.createElement('a')
              a.href = URL.createObjectURL(blob)
              a.download = `life-hub-${new Date().toISOString().slice(0, 10)}.json`
              a.click()
            }}
          >
            エクスポート
          </button>
          <label className="btn ghost sm">
            Life Hubをインポート
            <input
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (!f) return
                const reader = new FileReader()
                reader.onload = () => {
                  try {
                    const parsed = JSON.parse(String(reader.result))
                    if (parsed?.version === 1 || parsed?.version === 2) replaceData(parsed)
                    else alert('Life Hubのバックアップではありません')
                  } catch {
                    alert('読み込めませんでした')
                  }
                }
                reader.readAsText(f)
                e.target.value = ''
              }}
            />
          </label>
          <label className="btn sm">
            旧起業アプリから取り込み
            <input
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (!f) return
                const reader = new FileReader()
                reader.onload = () => {
                  try {
                    const parsed = JSON.parse(String(reader.result)) as Record<string, unknown>
                    if (!parsed.salesLogs && !parsed.snsLogs && !parsed.clients && !parsed.igList) {
                      setImportMsg('旧起業アプリのJSONではなさそうです')
                      return
                    }
                    importLegacyBusiness(parsed)
                    setImportMsg('旧起業データを取り込みました（起業タブで確認）')
                  } catch {
                    setImportMsg('読み込みに失敗しました')
                  }
                }
                reader.readAsText(f)
                e.target.value = ''
              }}
            />
          </label>
          <label className="btn sm">
            旧体重アプリから取り込み
            <input
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (!f) return
                const reader = new FileReader()
                reader.onload = () => {
                  try {
                    const parsed = JSON.parse(String(reader.result)) as Record<string, unknown>
                    if (!parsed.records && !parsed.exercises && !parsed.workouts && !parsed.settings) {
                      setImportMsg('旧体重アプリのJSONではなさそうです')
                      return
                    }
                    importLegacyBody(parsed)
                    setImportMsg('旧体重データを取り込みました（筋トレタブで確認）')
                  } catch {
                    setImportMsg('読み込みに失敗しました')
                  }
                }
                reader.readAsText(f)
                e.target.value = ''
              }}
            />
          </label>
        </div>
        {importMsg ? <p className="muted small" style={{ marginTop: '0.7rem' }}>{importMsg}</p> : null}
      </section>
    </motion.div>
  )
}

function AppShell() {
  const activeView = useHub((s) => s.activeView)
  const activeSpaceId = useHub((s) => s.activeSpaceId)
  const spacesAll = useHub((s) => s.spaces)
  const setView = useHub((s) => s.setView)
  const reorderSpaces = useHub((s) => s.reorderSpaces)

  useEffect(() => {
    const s = useHub.getState()
    const ensured = ensureCoreSpaces(s)
    const sameSpaces =
      ensured.spaces.length === s.spaces.length &&
      ensured.spaces.every((sp, i) => sp.id === s.spaces[i]?.id && sp.key === s.spaces[i]?.key)
    if (!sameSpaces || ensured.tasks.length !== s.tasks.length) {
      useHub.setState({ ...ensured, updatedAt: Date.now() })
    }
  }, [])

  const spaces = useMemo(
    () => (spacesAll ?? []).filter((x) => !x.archived),
    [spacesAll],
  )
  const spaceIds = useMemo(() => spaces.map((s) => s.id), [spaces])

  const activeSpace = spaces.find((s) => s.id === activeSpaceId)
  const isHub = activeView === 'home' || activeView === 'settings'
  const themeBrand = isHub ? '#0f172a' : activeSpace?.color || '#0f172a'

  const title =
    activeView === 'home'
      ? 'ホーム'
      : activeView === 'settings'
        ? '設定'
        : activeSpace?.name || '項目'

  return (
    <div
      className="app-shell"
      data-theme={isHub ? 'hub' : 'space'}
      style={{ ['--brand' as string]: themeBrand }}
    >
      <header className="topbar">
        <h1>{title}</h1>
      </header>

      <AnimatePresence mode="wait">
        {activeView === 'home' ? (
          <HomeView key="home" />
        ) : activeView === 'settings' ? (
          <SettingsView key="settings" />
        ) : activeSpaceId ? (
          <SpaceView key={activeSpaceId} spaceId={activeSpaceId} />
        ) : null}
      </AnimatePresence>

      <nav className="bottom-nav" aria-label="メイン">
        <button
          type="button"
          className={`nav-item nav-item-fixed ${activeView === 'home' ? 'active' : ''}`}
          onClick={() => setView('home')}
        >
          <div className="nav-dot" style={{ background: '#0f172a' }} />
          ホーム
        </button>

        <Reorder.Group
          as="div"
          axis="x"
          values={spaceIds}
          onReorder={reorderSpaces}
          className="nav-reorder"
        >
          {spaces.map((s) => (
            <Reorder.Item
              as="div"
              key={s.id}
              value={s.id}
              className="nav-reorder-item"
              whileDrag={{ scale: 1.06, zIndex: 5 }}
            >
              <button
                type="button"
                className={`nav-item ${activeView === 'space' && activeSpaceId === s.id ? 'active' : ''}`}
                onClick={() => setView('space', s.id)}
              >
                <div className="nav-dot" style={{ background: s.color }} />
                {s.name}
              </button>
            </Reorder.Item>
          ))}
        </Reorder.Group>

        <button
          type="button"
          className={`nav-item nav-item-fixed ${activeView === 'settings' ? 'active' : ''}`}
          onClick={() => setView('settings')}
        >
          <div className="nav-dot" style={{ background: '#0f172a' }} />
          設定
        </button>
      </nav>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppShell />
    </ErrorBoundary>
  )
}
