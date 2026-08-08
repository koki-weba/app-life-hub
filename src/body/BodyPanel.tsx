import { useEffect, useMemo, useState } from 'react'
import { useHub } from '../store'
import type { MuscleGroup, WorkoutEntry, WorkoutSet } from '../types'
import {
  MUSCLE_LABELS,
  est1rm,
  goalProgress,
  latestWeight,
  setVolume,
  todayStr,
  weekCalSum,
  weekDates,
  workoutVolume,
} from './helpers'

type Tab = 'record' | 'train' | 'goals'

function emptyEntry(exerciseId: string, sets?: WorkoutSet[]): WorkoutEntry {
  return {
    exerciseId,
    sets: sets?.length ? sets.map((s) => ({ ...s })) : [{ weight: 0, reps: 10 }],
  }
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
  const [weightDraft, setWeightDraft] = useState('')
  const [calDraft, setCalDraft] = useState('')
  const [msg, setMsg] = useState('')

  const [exName, setExName] = useState('')
  const [exMuscle, setExMuscle] = useState<MuscleGroup>('chest')
  const [pickExId, setPickExId] = useState('')
  const [trainDate, setTrainDate] = useState(todayStr())
  const [draftEntries, setDraftEntries] = useState<WorkoutEntry[]>([])

  const [settingsForm, setSettingsForm] = useState(() => ({
    height: body.settings.height?.toString() ?? '',
    startWeight: body.settings.startWeight?.toString() ?? '',
    targetWeight: body.settings.targetWeight?.toString() ?? '',
    targetDate: body.settings.targetDate ?? '',
    dailyCalGoal: String(body.settings.dailyCalGoal || 2000),
  }))

  const day = body.records[date]
  const current = latestWeight(body)
  const progress = goalProgress(body)
  const weekDays = weekDates()
  const weekSum = weekCalSum(body)
  const weekBudget = (body.settings.dailyCalGoal || 2000) * 7
  const weekRemain = weekBudget - weekSum

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
    // only hydrate when date changes from outside store churn
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

  return (
    <div className="biz">
      <div className="biz-tabs">
        {(
          [
            ['record', '記録'],
            ['train', '筋トレ'],
            ['goals', '目標'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            className={`btn sm ${tab === k ? '' : 'ghost'}`}
            onClick={() => setTab(k)}
          >
            {label}
          </button>
        ))}
      </div>

      {msg ? <p className="muted small" style={{ marginBottom: '0.6rem' }}>{msg}</p> : null}

      {tab === 'record' && (
        <>
          <section className="panel">
            <h2>きょうの状況</h2>
            <div className="kpi-grid">
              <div className="metric-card">
                <div className="muted small">現在体重</div>
                <strong>{current != null ? `${current} kg` : '—'}</strong>
              </div>
              <div className="metric-card">
                <div className="muted small">目標進捗</div>
                <strong>{progress != null ? `${progress}%` : '—'}</strong>
              </div>
              <div className="metric-card">
                <div className="muted small">今週カロリー</div>
                <strong>{weekSum.toLocaleString()} kcal</strong>
              </div>
              <div className="metric-card">
                <div className="muted small">残予算</div>
                <strong>{weekRemain.toLocaleString()} kcal</strong>
              </div>
            </div>
            <div className="week-cal-row" style={{ marginTop: '0.85rem' }}>
              {weekDays.map((d) => {
                const c = body.records[d]?.dailyCalories
                const label = d.slice(8)
                return (
                  <div key={d} className="week-cal-cell" data-filled={c != null}>
                    <span className="muted small">{label}</span>
                    <strong>{c != null ? c : '·'}</strong>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="panel">
            <h2>体重・カロリー</h2>
            <label className="field">
              <span>日付</span>
              <input
                className="input"
                type="date"
                value={date}
                onChange={(e) => {
                  const d = e.target.value
                  setDate(d)
                  const rec = body.records[d]
                  setWeightDraft(rec?.weight != null ? String(rec.weight) : '')
                  setCalDraft(rec?.dailyCalories != null ? String(rec.dailyCalories) : '')
                }}
              />
            </label>
            <p className="muted small" style={{ marginBottom: '0.7rem' }}>
              記録済み:{' '}
              {day?.weight != null ? `${day.weight} kg` : '体重なし'}
              {' · '}
              {day?.dailyCalories != null ? `${day.dailyCalories} kcal` : 'カロリーなし'}
            </p>
            <div className="row" style={{ marginBottom: '0.55rem' }}>
              <label className="field" style={{ flex: 1, marginBottom: 0 }}>
                <span>体重 (kg)</span>
                <input
                  className="input"
                  inputMode="decimal"
                  placeholder="例: 61.5"
                  value={weightDraft}
                  onChange={(e) => setWeightDraft(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="btn sm"
                style={{ alignSelf: 'flex-end' }}
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
                体重保存
              </button>
            </div>
            <div className="row">
              <label className="field" style={{ flex: 1, marginBottom: 0 }}>
                <span>カロリー (kcal)</span>
                <input
                  className="input"
                  inputMode="numeric"
                  placeholder="例: 1800"
                  value={calDraft}
                  onChange={(e) => setCalDraft(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="btn sm"
                style={{ alignSelf: 'flex-end' }}
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
                カロリー保存
              </button>
            </div>
          </section>
        </>
      )}

      {tab === 'train' && (
        <>
          <section className="panel">
            <h2>種目マスタ</h2>
            <div className="row" style={{ marginBottom: '0.55rem' }}>
              <input
                className="input"
                style={{ flex: 1 }}
                placeholder="種目名"
                value={exName}
                onChange={(e) => setExName(e.target.value)}
              />
              <select
                className="input"
                style={{ width: '6.5rem' }}
                value={exMuscle}
                onChange={(e) => setExMuscle(e.target.value as MuscleGroup)}
              >
                {(Object.keys(MUSCLE_LABELS) as MuscleGroup[]).map((k) => (
                  <option key={k} value={k}>
                    {MUSCLE_LABELS[k]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn sm"
                onClick={() => {
                  if (!exName.trim()) return
                  saveExercise({ name: exName, muscle: exMuscle })
                  setExName('')
                  flash('種目を追加しました')
                }}
              >
                追加
              </button>
            </div>
            <div className="task-list">
              {body.exercises.map((ex) => (
                <div key={ex.id} className="task-item">
                  <span className="task-title">
                    {ex.name}
                    <span className="muted small"> · {MUSCLE_LABELS[ex.muscle]}</span>
                  </span>
                  <button
                    type="button"
                    className="btn sm ghost danger"
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

          <section className="panel">
            <h2>トレーニング記録</h2>
            <label className="field">
              <span>日付</span>
              <input
                className="input"
                type="date"
                value={trainDate}
                onChange={(e) => {
                  const d = e.target.value
                  setTrainDate(d)
                  loadTrainDraft(d)
                }}
              />
            </label>
            <div className="row" style={{ marginBottom: '0.7rem' }}>
              <select
                className="input"
                style={{ flex: 1 }}
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
              <button
                type="button"
                className="btn sm"
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
                }}
              >
                追加
              </button>
              <button
                type="button"
                className="btn sm ghost"
                onClick={() => loadTrainDraft(trainDate)}
              >
                読込
              </button>
            </div>

            {draftEntries.length === 0 ? (
              <div className="empty">種目を追加してセットを記録</div>
            ) : (
              draftEntries.map((entry, ei) => {
                const ex = body.exercises.find((x) => x.id === entry.exerciseId)
                const vol = setVolume(entry.sets)
                return (
                  <div key={`${entry.exerciseId}-${ei}`} className="train-block">
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <strong>
                        {ex?.name ?? '不明'}
                        <span className="muted small">
                          {' '}
                          · 負荷 {Math.round(vol)} · 推定1RM{' '}
                          {entry.sets[0]
                            ? est1rm(entry.sets[0].weight, entry.sets[0].reps)
                            : '—'}
                        </span>
                      </strong>
                      <button
                        type="button"
                        className="btn sm ghost danger"
                        onClick={() =>
                          setDraftEntries((prev) => prev.filter((_, i) => i !== ei))
                        }
                      >
                        削除
                      </button>
                    </div>
                    {entry.sets.map((set, si) => (
                      <div key={si} className="row" style={{ marginTop: '0.35rem' }}>
                        <input
                          className="input"
                          style={{ width: '5rem' }}
                          inputMode="decimal"
                          value={set.weight}
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
                        <span className="muted small">kg ×</span>
                        <input
                          className="input"
                          style={{ width: '4rem' }}
                          inputMode="numeric"
                          value={set.reps}
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
                                          ? { ...s, reps: Number.isFinite(v) ? v : 0 }
                                          : s,
                                      ),
                                    },
                              ),
                            )
                          }}
                        />
                        <span className="muted small">回</span>
                        <button
                          type="button"
                          className="btn sm ghost"
                          onClick={() =>
                            setDraftEntries((prev) =>
                              prev.map((en, i) =>
                                i !== ei
                                  ? en
                                  : { ...en, sets: en.sets.filter((_, j) => j !== si) },
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
                      className="btn sm ghost"
                      style={{ marginTop: '0.4rem' }}
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
              })
            )}

            <div className="row" style={{ marginTop: '0.85rem' }}>
              <button
                type="button"
                className="btn"
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
                トレーニング保存
              </button>
            </div>
          </section>

          <section className="panel">
            <h2>直近のトレ</h2>
            {body.workouts.length === 0 ? (
              <div className="empty">まだありません</div>
            ) : (
              body.workouts
                .slice()
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 6)
                .map((w) => (
                  <div key={w.id} className="task-item">
                    <span className="task-title">
                      {w.date.slice(5)}
                      <span className="muted small">
                        {' '}
                        · {w.entries.length}種目 · 総負荷 {Math.round(workoutVolume(w))}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="btn sm ghost"
                      onClick={() => {
                        setTrainDate(w.date)
                        loadTrainDraft(w.date)
                      }}
                    >
                      開く
                    </button>
                  </div>
                ))
            )}
          </section>
        </>
      )}

      {tab === 'goals' && (
        <section className="panel">
          <h2>目標設定</h2>
          <label className="field">
            <span>身長 (cm)</span>
            <input
              className="input"
              inputMode="decimal"
              value={settingsForm.height}
              onChange={(e) => setSettingsForm((f) => ({ ...f, height: e.target.value }))}
            />
          </label>
          <label className="field">
            <span>開始体重 (kg)</span>
            <input
              className="input"
              inputMode="decimal"
              value={settingsForm.startWeight}
              onChange={(e) =>
                setSettingsForm((f) => ({ ...f, startWeight: e.target.value }))
              }
            />
          </label>
          <label className="field">
            <span>目標体重 (kg)</span>
            <input
              className="input"
              inputMode="decimal"
              value={settingsForm.targetWeight}
              onChange={(e) =>
                setSettingsForm((f) => ({ ...f, targetWeight: e.target.value }))
              }
            />
          </label>
          <label className="field">
            <span>目標日</span>
            <input
              className="input"
              type="date"
              value={settingsForm.targetDate}
              onChange={(e) =>
                setSettingsForm((f) => ({ ...f, targetDate: e.target.value }))
              }
            />
          </label>
          <label className="field">
            <span>1日カロリー目標 (kcal)</span>
            <input
              className="input"
              inputMode="numeric"
              value={settingsForm.dailyCalGoal}
              onChange={(e) =>
                setSettingsForm((f) => ({ ...f, dailyCalGoal: e.target.value }))
              }
            />
          </label>
          <button
            type="button"
            className="btn"
            onClick={() => {
              const num = (v: string) => {
                const n = Number(v)
                return v.trim() === '' || !Number.isFinite(n) ? null : n
              }
              saveBodySettings({
                height: num(settingsForm.height),
                startWeight: num(settingsForm.startWeight),
                targetWeight: num(settingsForm.targetWeight),
                targetDate: settingsForm.targetDate || null,
                dailyCalGoal: Math.max(1, Number(settingsForm.dailyCalGoal) || 2000),
              })
              flash('目標を保存しました')
            }}
          >
            保存
          </button>
        </section>
      )}
    </div>
  )
}
