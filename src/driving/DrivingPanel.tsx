import { useHub } from '../store'
import { formatTargetDate, targetDeadlineInfo } from '../lib/deadline'
import { drivingProgress } from './helpers'

export function DrivingPanel() {
  const driving = useHub((s) => s.driving)
  const toggleDrivingItem = useHub((s) => s.toggleDrivingItem)
  const setDrivingDates = useHub((s) => s.setDrivingDates)
  const progress = drivingProgress(driving)
  const deadline = targetDeadlineInfo(driving.targetDate)

  return (
    <div className="biz">
      <section className="panel">
        <h2 style={{ marginBottom: '0.35rem' }}>進捗</h2>
        <p className="muted small" style={{ marginTop: 0 }}>
          {driving.title}
        </p>
        <div className="drive-progress">
          <strong>{progress.pct}%</strong>
          <span className="muted small">
            {progress.done} / {progress.total} 完了
          </span>
        </div>
        <div
          className="drive-track"
          role="progressbar"
          aria-valuenow={progress.pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="drive-fill" style={{ width: `${progress.pct}%` }} />
        </div>

        <div className="body-goal-fields" style={{ marginTop: '0.85rem', marginBottom: 0 }}>
          <div className="body-goal-fields-label">免許取得の期間</div>
          <div className="row" style={{ marginBottom: 0 }}>
            <label className="field" style={{ flex: 1, marginBottom: 0 }}>
              <span>開始日</span>
              <input
                className="input"
                type="date"
                value={driving.startDate ?? ''}
                onChange={(e) =>
                  setDrivingDates({ startDate: e.target.value || null })
                }
              />
            </label>
            <label className="field" style={{ flex: 1, marginBottom: 0 }}>
              <span>達成期限</span>
              <input
                className="input"
                type="date"
                value={driving.targetDate ?? ''}
                onChange={(e) =>
                  setDrivingDates({ targetDate: e.target.value || null })
                }
              />
            </label>
          </div>
          {(driving.startDate || driving.targetDate) && (
            <div className="row" style={{ marginTop: '0.55rem' }}>
              <button
                type="button"
                className="btn sm ghost"
                onClick={() => setDrivingDates({ startDate: null, targetDate: null })}
              >
                期間をクリア
              </button>
            </div>
          )}
          <div className="body-goal-strip" style={{ marginTop: '0.65rem' }}>
            <div className="body-goal-item">
              <span className="muted small">期間</span>
              <strong>
                {driving.startDate || driving.targetDate
                  ? `${formatTargetDate(driving.startDate)} → ${formatTargetDate(driving.targetDate)}`
                  : '未設定'}
              </strong>
            </div>
            <div className="body-goal-item">
              <span className="muted small">残り</span>
              <strong data-deadline={deadline.status}>{deadline.label}</strong>
            </div>
          </div>
        </div>

        <p className="muted small" style={{ marginBottom: 0, marginTop: '0.75rem' }}>
          タップで ✓ を付け外しできます
        </p>
      </section>

      {driving.sections.map((sec) => {
        const done = sec.items.filter((i) => i.done).length
        return (
          <section key={sec.id} className="panel">
            <h2 style={{ marginBottom: '0.35rem' }}>{sec.title}</h2>
            <div className="drive-section-meta">
              {sec.note ? <p className="muted small" style={{ margin: 0 }}>{sec.note}</p> : <span />}
              <span className="count">
                {done} / {sec.items.length}
              </span>
            </div>
            <div className="drive-grid">
              {sec.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="drive-item"
                  data-done={item.done}
                  onClick={() => toggleDrivingItem(sec.id, item.id)}
                >
                  <span className="drive-check" aria-hidden>
                    {item.done ? '✓' : ''}
                  </span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </section>
        )
      })}

      <p className="drive-footnote">{driving.footnote}</p>
    </div>
  )
}
