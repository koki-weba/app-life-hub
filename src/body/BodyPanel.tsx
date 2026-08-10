import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { useHub } from '../store'
import type { MuscleGroup, WorkoutEntry, WorkoutSet } from '../types'
import { BODY_PHASE_LABEL } from '../types'
import { BodyCharts } from './BodyCharts'
import {
  BODY_PHASES,
  MUSCLE_LABELS,
  est1rm,
  formatTargetDate,
  goalProgress,
  latestWeight,
  setVolume,
  targetDeadlineInfo,
  todayStr,
  weekCalSum,
  weekDates,
  workoutVolume,
} from './helpers'

type Tab = 'record' | 'train' | 'goals' | 'graph'

const WEEKDAY_JA = ['月', '火', '水', '木', '金', '土', '日']
const RING_C = 2 * Math.PI * 52

function emptyEntry(exerciseId: string, sets?: WorkoutSet[]): WorkoutEntry {
  return {
    exerciseId,
    sets: sets?.length ? sets.map((s) => ({ ...s })) : [{ weight: 0, reps: 10 }],
  }
}

function weekRangeLabel(days: string[]) {
  if (days.length < 2) return '—'
  const a = parseISO(days[0])
  const b = parseISO(days[days.length - 1])
  return `${format(a, 'M月d日')} – ${format(b, 'M月d日')}`
}

export function BodyPanel() {
  const body = useHub((s) => s.body)
  const saveDayWeight = useHub((s) => s.saveDayWeight)
  const saveDayCalories = useHub((s) => s.saveDayCalories)
  const saveBodySettings = useHub((s) => s.saveBodySettings)
  const saveExercise = useHub((s) => s.saveExercise)
  const deleteExercise = useHub((s) => s.deleteExercise)
  const saveWorkout = useHub((s) => s.saveWorkout)
  const deleteWorkout = useHub((s) => s.deleteWorkout)

  const [tab, setTab] = useState<Tab>('record')
  const [date, setDate] = useState(todayStr())
  const [weightDraft, setWeightDraft] = useState(() => {
    const w = useHub.getState().body.records[todayStr()]?.weight
    return w != null ? String(w) : ''
  })
  const [calDraft, setCalDraft] = useState(() => {
    const c = useHub.getState().body.records[todayStr()]?.dailyCalories
    return c != null ? String(c) : ''
  })
  const [msg, setMsg] = useState('')
  const [recordFocus, setRecordFocus] = useState<'weight' | 'cal' | null>(null)

  const [exName, setExName] = useState('')
  const [exMuscle, setExMuscle] = useState<MuscleGroup>('chest')
  const [pickExId, setPickExId] = useState('')
  const [trainDate, setTrainDate] = useState(todayStr())
  const [draftEntries, setDraftEntries] = useState<WorkoutEntry[]>([])

  const [settingsForm, setSettingsForm] = useState(() => ({
    height: body.settings.height?.toString() ?? '',
    startWeight: body.settings.startWeight?.toString() ?? '',
    targetWeight: body.settings.targetWeight?.toString() ?? '',
    targetStartDate: body.settings.targetStartDate ?? '',
    targetDate: body.settings.targetDate ?? '',
    dailyCalGoal: String(body.settings.dailyCalGoal || 2000),
  }))

  const day = body.records[date]
  const today = todayStr()
  const todayRec = body.records[today]
  const current = latestWeight(body)
  const progress = goalProgress(body)
  const weekDays = weekDates()
  const weekSum = weekCalSum(body)
  const weekBudget = (body.settings.dailyCalGoal || 2000) * 7
  const weekRemain = weekBudget - weekSum
  const weekPct = weekBudget > 0 ? Math.min(100, (weekSum / weekBudget) * 100) : 0
  const deadline = targetDeadlineInfo(body.settings.targetDate)
  const target = body.settings.targetWeight
  const diff =
    current != null && target != null
      ? Math.round((current - target) * 10) / 10
      : null
  const ringPct = progress ?? 0
  const ringOffset = RING_C * (1 - ringPct / 100)
  const draftVolume = useMemo(
    () => draftEntries.reduce((s, e) => s + setVolume(e.sets), 0),
    [draftEntries],
  )

  useEffect(() => {
    if (tab !== 'goals') return
    setSettingsForm({
      height: body.settings.height?.toString() ?? '',
      startWeight: body.settings.startWeight?.toString() ?? '',
      targetWeight: body.settings.targetWeight?.toString() ?? '',
      targetStartDate: body.settings.targetStartDate ?? '',
      targetDate: body.settings.targetDate ?? '',
      dailyCalGoal: String(body.settings.dailyCalGoal || 2000),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const workoutForDate = useMemo(
    () => body.workouts.find((w) => w.date === trainDate) ?? null,
    [body.workouts, trainDate],
  )

  useEffect(() => {
    const existing = body.workouts.find((w) => w.date === trainDate)
    setDraftEntries(
      existing
        ? existing.entries.map((e) => ({
            exerciseId: e.exerciseId,
            sets: e.sets.map((s) => ({ ...s })),
          }))
        : [],
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainDate])

  const loadTrainDraft = (d: string) => {
    const existing = body.workouts.find((w) => w.date === d)
    setDraftEntries(
      existing
        ? existing.entries.map((e) => ({
            exerciseId: e.exerciseId,
            sets: e.sets.map((s) => ({ ...s })),
          }))
        : [],
    )
  }

  const lastSetsFor = (exerciseId: string) => {
    const sorted = [...body.workouts].sort((a, b) => b.date.localeCompare(a.date))
    for (const w of sorted) {
      const entry = w.entries.find((e) => e.exerciseId === exerciseId)
      if (entry?.sets?.length) return entry.sets
    }
    return undefined
  }

  const flash = (text: string) => {
    setMsg(text)
    window.setTimeout(() => setMsg(''), 2200)
  }

  const selectDate = (d: string) => {
    setDate(d)
    const rec = body.records[d]
    setWeightDraft(rec?.weight != null ? String(rec.weight) : '')
    setCalDraft(rec?.dailyCalories != null ? String(rec.dailyCalories) : '')
  }

  const heroSub =
    target == null
      ? '目標体重を設定してください'
      : progress != null
        ? `目標まで ${diff != null ? `${Math.abs(diff)} kg` : '—'}`
        : '体重を記録すると進捗が表示されます'

  return (
    <div className="body-ui">
      <div className="body-tabs">
        {(
          [
            ['record', 'ホーム'],
            ['train', '筋トレ'],
            ['graph', 'グラフ'],
            ['goals', '設定'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            className={`body-tab${tab === k ? ' is-active' : ''}`}
            onClick={() => setTab(k)}
          >
            {label}
          </button>
        ))}
      </div>

      {msg ? <p className="body-toast">{msg}</p> : null}

      {tab === 'record' && (
        <>
          <div className="body-phase" role="group" aria-label="フェーズ">
            {BODY_PHASES.map((phase) => (
              <button
                key={phase}
                type="button"
                className={`body-phase-chip${body.settings.phase === phase ? ' is-active' : ''}`}
                onClick={() => saveBodySettings({ phase })}
              >
                {BODY_PHASE_LABEL[phase]}
              </button>
            ))}
          </div>

          <section className="body-hero">
            <div className="body-hero-top">
              <div>
                <span className="body-hero-label">目標達成度</span>
                <h2 className="body-hero-pct">
                  {progress != null ? `${progress}%` : '—%'}
                </h2>
                <p className="body-hero-sub">{heroSub}</p>
                {body.settings.targetDate && deadline.status !== 'none' ? (
                  <p
                    className={`body-hero-countdown${
                      deadline.status === 'overdue'
                        ? ' is-overdue'
                        : deadline.daysLeft === 0
                          ? ' is-today'
                          : ''
                    }`}
                  >
                    <span className="body-hero-countdown-num">{deadline.label}</span>
                  </p>
                ) : null}
              </div>
              <div className="body-ring-wrap" aria-hidden>
                <svg className="body-ring" viewBox="0 0 120 120">
                  <circle className="body-ring-bg" cx="60" cy="60" r="52" />
                  <circle
                    className="body-ring-fg"
                    cx="60"
                    cy="60"
                    r="52"
                    strokeDasharray={RING_C}
                    strokeDashoffset={ringOffset}
                  />
                </svg>
                <div className="body-ring-center">
                  <span>{ringPct}</span>
                  <small>%</small>
                </div>
              </div>
            </div>
            <div className="body-hero-stats">
              <div className="body-hero-stat">
                <span>現在</span>
                <strong>{current != null ? `${current} kg` : '— kg'}</strong>
              </div>
              <div className="body-hero-stat">
                <span>目標</span>
                <strong>{target != null ? `${target} kg` : '— kg'}</strong>
              </div>
              <div className="body-hero-stat">
                <span>差分</span>
                <strong>
                  {diff != null ? `${diff > 0 ? '+' : ''}${diff} kg` : '— kg'}
                </strong>
              </div>
            </div>
          </section>

          <section className="body-card">
            <div className="body-card-head">
              <h3>今週のカロリー収支</h3>
              <span className="body-badge">{weekRangeLabel(weekDays)}</span>
            </div>
            <div className="body-cal-main">
              <div className={`body-cal-remain${weekRemain < 0 ? ' is-over' : ''}`}>
                <span className="body-cal-remain-label">残り摂取可能</span>
                <strong>{weekRemain.toLocaleString()}</strong>
                <small>kcal</small>
              </div>
              <div className="body-cal-bar-wrap">
                <div className="body-cal-bar">
                  <div
                    className={`body-cal-bar-fill${weekRemain < 0 ? ' is-over' : ''}`}
                    style={{ width: `${Math.min(100, weekPct)}%` }}
                  />
                </div>
                <div className="body-cal-meta">
                  <span>
                    摂取: <b>{weekSum.toLocaleString()}</b> kcal
                  </span>
                  <span>
                    予算: <b>{weekBudget.toLocaleString()}</b> kcal
                  </span>
                </div>
              </div>
            </div>
            <div className="body-day-row">
              {weekDays.map((d, i) => {
                const c = body.records[d]?.dailyCalories
                const isToday = d === today
                const isSelected = d === date
                return (
                  <button
                    key={d}
                    type="button"
                    className={`body-day-cell${isToday ? ' is-today' : ''}${
                      isSelected ? ' is-selected' : ''
                    }`}
                    onClick={() => {
                      selectDate(d)
                      setRecordFocus('cal')
                    }}
                  >
                    <span className="body-day-name">{WEEKDAY_JA[i]}</span>
                    <span className="body-day-num">{d.slice(8)}</span>
                    <span className="body-day-cal">{c != null ? c : '·'}</span>
                  </button>
                )
              })}
            </div>
          </section>

          <div className="body-quick-grid">
            <button
              type="button"
              className="body-quick-btn"
              onClick={() => {
                selectDate(today)
                setRecordFocus('weight')
              }}
            >
              <span className="body-quick-icon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 4h12l1 16H5L6 4z" />
                  <path d="M12 9v5M9 9h6" />
                </svg>
              </span>
              <span>体重を記録</span>
            </button>
            <button
              type="button"
              className="body-quick-btn"
              onClick={() => {
                selectDate(today)
                setRecordFocus('cal')
              }}
            >
              <span className="body-quick-icon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 11h18M12 11v9M6 11a6 6 0 0 1 12 0" />
                </svg>
              </span>
              <span>カロリーを記録</span>
            </button>
            <button
              type="button"
              className="body-quick-btn"
              onClick={() => setTab('train')}
            >
              <span className="body-quick-icon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6.5 6.5l11 11M4 10l2-2 2 2M16 14l2 2 2-2M8 4l2 2M14 18l2 2" />
                </svg>
              </span>
              <span>筋トレを記録</span>
            </button>
          </div>

          <section className="body-card">
            <div className="body-card-head">
              <h3>今日の記録</h3>
              <span className="body-date-text">
                {format(parseISO(today), 'M月d日')}
              </span>
            </div>
            <div className="body-today-grid">
              <div className="body-today-item">
                <span>体重</span>
                <strong>
                  {todayRec?.weight != null ? `${todayRec.weight} kg` : '未入力'}
                </strong>
              </div>
              <div className="body-today-item">
                <span>摂取カロリー</span>
                <strong>
                  {todayRec?.dailyCalories != null
                    ? `${todayRec.dailyCalories.toLocaleString()} kcal`
                    : '0 kcal'}
                </strong>
              </div>
            </div>
          </section>

          <section
            className={`body-card${recordFocus === 'weight' ? ' is-focus' : ''}`}
            id="body-weight-form"
          >
            <div className="body-card-head">
              <h3>体重</h3>
              <span className="body-badge">{date.slice(5)}</span>
            </div>
            <label className="body-field">
              <span>日付</span>
              <input
                className="body-input"
                type="date"
                value={date}
                onChange={(e) => selectDate(e.target.value)}
              />
            </label>
            <label className="body-field">
              <span>体重 (kg)</span>
              <input
                className="body-input"
                inputMode="decimal"
                placeholder="例: 61.5"
                value={weightDraft}
                onChange={(e) => setWeightDraft(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="body-btn-primary"
              onClick={() => {
                const v = Number(weightDraft)
                if (!Number.isFinite(v)) {
                  flash('体重を入力してください')
                  return
                }
                saveDayWeight(date, v)
                flash('体重を保存しました')
              }}
            >
              体重を保存
            </button>
          </section>

          <section
            className={`body-card${recordFocus === 'cal' ? ' is-focus' : ''}`}
            id="body-cal-form"
          >
            <div className="body-card-head">
              <h3>摂取カロリー</h3>
              <span className="body-badge">{date.slice(5)}</span>
            </div>
            <label className="body-field">
              <span>その日の合計摂取カロリー (kcal)</span>
              <input
                className="body-input"
                inputMode="numeric"
                placeholder="例: 1800"
                value={calDraft}
                onChange={(e) => setCalDraft(e.target.value)}
              />
            </label>
            <p className="body-hint">
              記録済み:{' '}
              {day?.weight != null ? `${day.weight} kg` : '体重なし'}
              {' · '}
              {day?.dailyCalories != null ? `${day.dailyCalories} kcal` : 'カロリーなし'}
            </p>
            <button
              type="button"
              className="body-btn-primary"
              onClick={() => {
                const v = Number(calDraft)
                if (!Number.isFinite(v) || v < 0) {
                  flash('カロリーを入力してください')
                  return
                }
                saveDayCalories(date, Math.round(v))
                flash('カロリーを保存しました')
              }}
            >
              カロリーを保存
            </button>
          </section>
        </>
      )}

      {tab === 'train' && (
        <>
          <section className="body-card">
            <div className="body-card-head">
              <h3>トレーニング日</h3>
              <span className="body-badge">
                総負荷 {Math.round(draftVolume).toLocaleString()} kg
              </span>
            </div>
            <input
              className="body-input body-date-input"
              type="date"
              value={trainDate}
              onChange={(e) => {
                const d = e.target.value
                setTrainDate(d)
                loadTrainDraft(d)
              }}
            />
          </section>

          <section className="body-card">
            <div className="body-card-head">
              <h3>種目を追加</h3>
            </div>
            <label className="body-field">
              <span>種目を選ぶ</span>
              <select
                className="body-input"
                value={pickExId}
                onChange={(e) => setPickExId(e.target.value)}
              >
                <option value="">種目を選択</option>
                {body.exercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}（{MUSCLE_LABELS[ex.muscle]}）
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="body-btn-primary"
              onClick={() => {
                if (!pickExId) return
                if (draftEntries.some((e) => e.exerciseId === pickExId)) {
                  flash('すでに追加済みです')
                  return
                }
                setDraftEntries((prev) => [
                  ...prev,
                  emptyEntry(pickExId, lastSetsFor(pickExId)),
                ])
                setPickExId('')
              }}
            >
              この種目を追加
            </button>
          </section>

          <section className="body-card">
            <div className="body-card-head">
              <h3>本日のメニュー</h3>
            </div>
            {draftEntries.length === 0 ? (
              <p className="body-hint body-empty-hint">
                上から種目を選んで追加すると、ここにセット入力が表示されます
              </p>
            ) : (
              <div className="body-train-entries">
                {draftEntries.map((entry, ei) => {
                  const ex = body.exercises.find((x) => x.id === entry.exerciseId)
                  const vol = setVolume(entry.sets)
                  return (
                    <div key={`${entry.exerciseId}-${ei}`} className="body-train-entry">
                      <div className="body-train-entry-head">
                        <div>
                          <strong>{ex?.name ?? '不明'}</strong>
                          <span className="body-hint">
                            {ex ? MUSCLE_LABELS[ex.muscle] : ''} · 負荷{' '}
                            {Math.round(vol)} · 推定1RM{' '}
                            {entry.sets[0]
                              ? est1rm(entry.sets[0].weight, entry.sets[0].reps)
                              : '—'}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="body-btn-ghost body-btn-danger"
                          onClick={() =>
                            setDraftEntries((prev) => prev.filter((_, i) => i !== ei))
                          }
                        >
                          削除
                        </button>
                      </div>
                      {entry.sets.map((set, si) => (
                        <div key={si} className="body-set-row">
                          <span className="body-set-idx">{si + 1}</span>
                          <input
                            className="body-input"
                            inputMode="decimal"
                            value={set.weight}
                            aria-label="重量"
                            onChange={(e) => {
                              const v = Number(e.target.value)
                              setDraftEntries((prev) =>
                                prev.map((en, i) =>
                                  i !== ei
                                    ? en
                                    : {
                                        ...en,
                                        sets: en.sets.map((s, j) =>
                                          j === si
                                            ? {
                                                ...s,
                                                weight: Number.isFinite(v) ? v : 0,
                                              }
                                            : s,
                                        ),
                                      },
                                ),
                              )
                            }}
                          />
                          <span className="body-set-x">kg ×</span>
                          <input
                            className="body-input"
                            inputMode="numeric"
                            value={set.reps}
                            aria-label="回数"
                            onChange={(e) => {
                              const v = parseInt(e.target.value, 10)
                              setDraftEntries((prev) =>
                                prev.map((en, i) =>
                                  i !== ei
                                    ? en
                                    : {
                                        ...en,
                                        sets: en.sets.map((s, j) =>
                                          j === si
                                            ? {
                                                ...s,
                                                reps: Number.isFinite(v) ? v : 0,
                                              }
                                            : s,
                                        ),
                                      },
                                ),
                              )
                            }}
                          />
                          <span className="body-set-x">回</span>
                          <button
                            type="button"
                            className="body-btn-ghost body-set-remove"
                            onClick={() =>
                              setDraftEntries((prev) =>
                                prev.map((en, i) =>
                                  i !== ei
                                    ? en
                                    : {
                                        ...en,
                                        sets: en.sets.filter((_, j) => j !== si),
                                      },
                                ),
                              )
                            }
                          >
                            −
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="body-btn-secondary body-set-add"
                        onClick={() =>
                          setDraftEntries((prev) =>
                            prev.map((en, i) =>
                              i !== ei
                                ? en
                                : {
                                    ...en,
                                    sets: [
                                      ...en.sets,
                                      {
                                        weight: en.sets.at(-1)?.weight ?? 0,
                                        reps: en.sets.at(-1)?.reps ?? 10,
                                      },
                                    ],
                                  },
                            ),
                          )
                        }
                      >
                        セット追加
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
            <button
              type="button"
              className="body-btn-primary"
              onClick={() => {
                const cleaned = draftEntries
                  .map((e) => ({
                    ...e,
                    sets: e.sets.filter((s) => s.reps > 0 && s.weight >= 0),
                  }))
                  .filter((e) => e.sets.length > 0)
                if (cleaned.length === 0) {
                  deleteWorkout(trainDate)
                  setDraftEntries([])
                  flash('この日のトレを削除しました')
                  return
                }
                saveWorkout({
                  id: workoutForDate?.id,
                  date: trainDate,
                  note: workoutForDate?.note ?? '',
                  entries: cleaned,
                })
                flash('トレーニングを保存しました')
              }}
            >
              トレーニングを保存
            </button>
          </section>

          <section className="body-card">
            <div className="body-card-head">
              <h3>直近のトレ</h3>
            </div>
            {body.workouts.length === 0 ? (
              <p className="body-hint">まだありません</p>
            ) : (
              <div className="body-recent-list">
                {body.workouts
                  .slice()
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .slice(0, 6)
                  .map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      className="body-recent-item"
                      onClick={() => {
                        setTrainDate(w.date)
                        loadTrainDraft(w.date)
                      }}
                    >
                      <span>
                        <strong>{w.date.slice(5)}</strong>
                        <span className="body-hint">
                          {w.entries.length}種目 · 総負荷{' '}
                          {Math.round(workoutVolume(w)).toLocaleString()}
                        </span>
                      </span>
                      <span className="body-recent-open">開く</span>
                    </button>
                  ))}
              </div>
            )}
          </section>

          <section className="body-card">
            <div className="body-card-head">
              <h3>種目マスタ</h3>
            </div>
            <div className="body-ex-form">
              <label className="body-field">
                <span>種目名</span>
                <input
                  className="body-input"
                  placeholder="例: ベンチプレス"
                  value={exName}
                  onChange={(e) => setExName(e.target.value)}
                />
              </label>
              <label className="body-field">
                <span>部位</span>
                <select
                  className="body-input"
                  value={exMuscle}
                  onChange={(e) => setExMuscle(e.target.value as MuscleGroup)}
                >
                  {(Object.keys(MUSCLE_LABELS) as MuscleGroup[]).map((k) => (
                    <option key={k} value={k}>
                      {MUSCLE_LABELS[k]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button
              type="button"
              className="body-btn-secondary"
              onClick={() => {
                if (!exName.trim()) return
                saveExercise({ name: exName, muscle: exMuscle })
                setExName('')
                flash('種目を追加しました')
              }}
            >
              種目を登録
            </button>
            <div className="body-ex-list">
              {body.exercises.map((ex) => (
                <div key={ex.id} className="body-ex-item">
                  <span>
                    <strong>{ex.name}</strong>
                    <span className="body-hint">{MUSCLE_LABELS[ex.muscle]}</span>
                  </span>
                  <button
                    type="button"
                    className="body-btn-ghost body-btn-danger"
                    onClick={() => {
                      if (confirm(`「${ex.name}」を削除しますか？`)) deleteExercise(ex.id)
                    }}
                  >
                    削除
                  </button>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {tab === 'graph' && <BodyCharts />}

      {tab === 'goals' && (
        <section className="body-card">
          <div className="body-card-head">
            <h3>身体情報・目標</h3>
          </div>
          <label className="body-field">
            <span>身長 (cm)</span>
            <input
              className="body-input"
              inputMode="decimal"
              value={settingsForm.height}
              onChange={(e) => setSettingsForm((f) => ({ ...f, height: e.target.value }))}
            />
          </label>
          <label className="body-field">
            <span>開始体重 (kg)</span>
            <input
              className="body-input"
              inputMode="decimal"
              value={settingsForm.startWeight}
              onChange={(e) =>
                setSettingsForm((f) => ({ ...f, startWeight: e.target.value }))
              }
            />
          </label>
          <label className="body-field">
            <span>目標体重 (kg)</span>
            <input
              className="body-input"
              inputMode="decimal"
              placeholder="例: 60.0"
              value={settingsForm.targetWeight}
              onChange={(e) =>
                setSettingsForm((f) => ({ ...f, targetWeight: e.target.value }))
              }
            />
          </label>
          <div className="body-goal-dates">
            <label className="body-field">
              <span>開始日</span>
              <input
                className="body-input"
                type="date"
                value={settingsForm.targetStartDate}
                onChange={(e) =>
                  setSettingsForm((f) => ({ ...f, targetStartDate: e.target.value }))
                }
              />
            </label>
            <label className="body-field">
              <span>達成期限</span>
              <input
                className="body-input"
                type="date"
                value={settingsForm.targetDate}
                onChange={(e) =>
                  setSettingsForm((f) => ({ ...f, targetDate: e.target.value }))
                }
              />
            </label>
          </div>
          <p className="body-hint">
            {settingsForm.targetWeight.trim()
              ? settingsForm.targetDate
                ? `目標 ${settingsForm.targetWeight} kg を ${
                    settingsForm.targetStartDate
                      ? `${formatTargetDate(settingsForm.targetStartDate)} から `
                      : ''
                  }${formatTargetDate(settingsForm.targetDate)} までに達成`
                : '開始日と達成期限を設定すると、ホームのゲージに反映されます'
              : '目標体重に合わせて開始日・達成期限を設定できます'}
          </p>
          <label className="body-field" style={{ marginTop: '0.75rem' }}>
            <span>1日カロリー目標 (kcal)</span>
            <input
              className="body-input"
              inputMode="numeric"
              value={settingsForm.dailyCalGoal}
              onChange={(e) =>
                setSettingsForm((f) => ({ ...f, dailyCalGoal: e.target.value }))
              }
            />
          </label>
          <button
            type="button"
            className="body-btn-primary"
            onClick={() => {
              const num = (v: string) => {
                const n = Number(v)
                return v.trim() === '' || !Number.isFinite(n) ? null : n
              }
              saveBodySettings({
                height: num(settingsForm.height),
                startWeight: num(settingsForm.startWeight),
                targetWeight: num(settingsForm.targetWeight),
                targetStartDate: settingsForm.targetStartDate || null,
                targetDate: settingsForm.targetDate || null,
                dailyCalGoal: Math.max(1, Number(settingsForm.dailyCalGoal) || 2000),
              })
              flash('目標を保存しました')
            }}
          >
            設定を保存
          </button>
        </section>
      )}
    </div>
  )
}
