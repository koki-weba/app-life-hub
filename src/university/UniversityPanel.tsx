import { useMemo, useState } from 'react'
import { useHub } from '../store'
import {
  UNIVERSITY_TERM_IDS,
  UNIVERSITY_TERM_LABEL,
  courseStats,
  coursesForTerm,
  cycleMark,
  formatRate,
  markLabel,
  overallStats,
  rateStatus,
  statusLabel,
} from './helpers'

type Tab = 'record' | 'summary'

export function UniversityPanel() {
  const university = useHub((s) => s.university)
  const setAttendance = useHub((s) => s.setAttendance)
  const setActiveUniversityTerm = useHub((s) => s.setActiveUniversityTerm)
  const addUniversityCourse = useHub((s) => s.addUniversityCourse)
  const deleteUniversityCourse = useHub((s) => s.deleteUniversityCourse)
  const [tab, setTab] = useState<Tab>('record')
  const [form, setForm] = useState({ weekday: '月曜', period: '1講目', name: '' })

  const activeTermId = university.activeTermId || 'y3_zenki'
  const termCourses = useMemo(
    () => coursesForTerm(university, activeTermId),
    [university, activeTermId],
  )
  const overall = overallStats(university, activeTermId)
  const overallStatus = rateStatus(overall.rate, university)
  const termLabel = UNIVERSITY_TERM_LABEL[activeTermId]

  return (
    <div className="biz">
      <div className="uni-term-tabs" role="tablist" aria-label="学年・学期">
        {UNIVERSITY_TERM_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTermId === id}
            className={`btn sm ${activeTermId === id ? '' : 'ghost'}`}
            onClick={() => setActiveUniversityTerm(id)}
          >
            {UNIVERSITY_TERM_LABEL[id]}
          </button>
        ))}
      </div>

      <div className="biz-tabs">
        {(
          [
            ['record', '出席記録'],
            ['summary', 'サマリー'],
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

      <section className="panel">
        <h2>{termLabel} · 全体</h2>
        <div className="uni-overall">
          <div className="uni-stat">
            <div className="muted small">出席率</div>
            <strong>{formatRate(overall.rate)}</strong>
          </div>
          <div className="uni-stat">
            <div className="muted small">出席 / 欠席</div>
            <strong>
              {overall.present} / {overall.absent}
            </strong>
          </div>
          <div className="uni-stat">
            <div className="muted small">状況</div>
            <span className="uni-status" data-status={overallStatus}>
              {statusLabel(overallStatus)}
            </span>
          </div>
        </div>
        <p className="muted small" style={{ margin: '0.65rem 0 0' }}>
          科目 {termCourses.length} · 学期を切り替えてそれぞれ管理できます
        </p>
      </section>

      {tab === 'record' ? (
        <>
          {termCourses.length === 0 ? (
            <section className="panel">
              <div className="empty">
                {termLabel}の科目はまだありません。下から追加してください。
              </div>
            </section>
          ) : (
            termCourses.map((course) => {
              const stats = courseStats(course)
              const status = rateStatus(stats.rate, university)
              return (
                <section key={course.id} className="panel uni-course">
                  <div className="uni-course-head">
                    <div>
                      <div className="muted small">
                        {course.weekday} · {course.period}
                      </div>
                      <h2 style={{ margin: 0 }}>{course.name}</h2>
                    </div>
                    <div className="uni-course-meta">
                      <span className="uni-status" data-status={status}>
                        {formatRate(stats.rate)}
                      </span>
                      <button
                        type="button"
                        className="btn sm ghost danger"
                        onClick={() => deleteUniversityCourse(course.id)}
                      >
                        削除
                      </button>
                    </div>
                  </div>
                  <div className="uni-sessions">
                    {course.sessions.map((mark, i) => (
                      <button
                        key={i}
                        type="button"
                        className="uni-session"
                        data-mark={mark ?? 'empty'}
                        onClick={() => setAttendance(course.id, i, cycleMark(mark))}
                        title={`第${i + 1}回（タップで切替）`}
                      >
                        <span className="uni-session-n">{i + 1}</span>
                        <strong>{markLabel(mark)}</strong>
                      </button>
                    ))}
                  </div>
                  <p className="muted small" style={{ margin: '0.55rem 0 0' }}>
                    出席 {stats.present} · 欠席 {stats.absent} · タップで ○ → × → 空欄
                  </p>
                </section>
              )
            })
          )}

          <section className="panel">
            <h2>{termLabel}に科目を追加</h2>
            <div className="row" style={{ marginBottom: '0.55rem' }}>
              <label className="field" style={{ flex: 1, marginBottom: 0 }}>
                <span>曜日</span>
                <select
                  className="input"
                  value={form.weekday}
                  onChange={(e) => setForm((f) => ({ ...f, weekday: e.target.value }))}
                >
                  {['月曜', '火曜', '水曜', '木曜', '金曜', '土曜'].map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" style={{ flex: 1, marginBottom: 0 }}>
                <span>講目</span>
                <select
                  className="input"
                  value={form.period}
                  onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
                >
                  {['1講目', '2講目', '3講目', '4講目', '5講目'].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="field">
              <span>科目名</span>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="科目名"
              />
            </label>
            <button
              type="button"
              className="btn sm"
              onClick={() => {
                if (!form.name.trim()) return
                addUniversityCourse(form.weekday, form.period, form.name.trim())
                setForm((f) => ({ ...f, name: '' }))
              }}
            >
              追加
            </button>
          </section>
        </>
      ) : (
        <section className="panel">
          <h2>{termLabel} · 科目別出席率</h2>
          <div className="uni-summary-list">
            {termCourses.length === 0 ? (
              <div className="empty">この学期の科目はまだありません</div>
            ) : (
              termCourses.map((course) => {
                const stats = courseStats(course)
                const status = rateStatus(stats.rate, university)
                return (
                  <div key={course.id} className="uni-summary-row">
                    <div>
                      <div className="muted small">
                        {course.weekday} · {course.period}
                      </div>
                      <strong>{course.name}</strong>
                    </div>
                    <div className="uni-summary-right">
                      <span>{formatRate(stats.rate)}</span>
                      <span className="uni-status" data-status={status}>
                        {statusLabel(status)}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
            <div className="uni-summary-row uni-summary-total">
              <strong>{termLabel} 全体</strong>
              <div className="uni-summary-right">
                <span>{formatRate(overall.rate)}</span>
                <span className="uni-status" data-status={overallStatus}>
                  {statusLabel(overallStatus)}
                </span>
              </div>
            </div>
          </div>
          <p className="muted small" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
            良好 ≥{Math.round(university.goodRate * 100)}% · 注意 ≥
            {Math.round(university.cautionRate * 100)}% · それ未満は危険
          </p>
        </section>
      )}
    </div>
  )
}
