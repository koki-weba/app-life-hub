import { useMemo, useState } from 'react'
import { todayStr } from './helpers'
import {
  PLAN_GOAL,
  PLAN_NEAR_GATE,
  PLAN_PHASES,
  currentPhase,
  daysUntil,
  getCurrentPlanDeadline,
  monthStatus,
  phaseStatus,
  type PlanPhase,
  type PlanStatus,
} from './planRoadmap'

const STATUS_LABEL: Record<PlanStatus, string> = {
  done: '完了',
  now: 'いま',
  next: '次',
  later: '先',
}

function StatusPill({ status }: { status: PlanStatus }) {
  return <span className={`biz-plan-pill biz-plan-pill--${status}`}>{STATUS_LABEL[status]}</span>
}

function PhaseBlock({
  phase,
  today,
  open,
  onToggle,
}: {
  phase: PlanPhase
  today: string
  open: boolean
  onToggle: () => void
}) {
  const status = phaseStatus(phase, today)

  return (
    <article className={`biz-plan-phase biz-plan-phase--${status}${open ? ' is-open' : ''}`}>
      <span className="biz-plan-dot" aria-hidden />
      <button type="button" className="biz-plan-phase-head" onClick={onToggle} aria-expanded={open}>
        <span className="biz-plan-phase-meta">
          <span className="biz-plan-phase-code">{phase.code}</span>
          <span className="biz-plan-phase-period">{phase.period}</span>
        </span>
        <span className="biz-plan-phase-title">
          <strong>{phase.theme}</strong>
          <span className="muted small">ストック {phase.stockHint}</span>
        </span>
        <StatusPill status={status} />
        <span className="biz-plan-chevron" aria-hidden>
          {open ? '−' : '+'}
        </span>
      </button>

      {open ? (
        <div className="biz-plan-phase-body">
          <p className="biz-plan-focus">{phase.focus}</p>
          <ul className="biz-plan-gates">
            {phase.gates.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>

          {phase.months?.length ? (
            <div className="biz-plan-months">
              <h3>月次（上から時系列）</h3>
              <ol className="biz-plan-month-rail">
                {phase.months.map((m) => {
                  const ms = monthStatus(m.month, today)
                  return (
                    <li key={m.id} className={`biz-plan-month biz-plan-month--${ms}`}>
                      <div className="biz-plan-month-head">
                        <span className="biz-plan-month-label">{m.label}</span>
                        <StatusPill status={ms} />
                        {m.gate ? <span className="biz-plan-month-gate">{m.gate}</span> : null}
                      </div>
                      <ul>
                        {m.must.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                      {m.stretch?.length ? (
                        <p className="muted small">伸ばし: {m.stretch.join(' / ')}</p>
                      ) : null}
                    </li>
                  )
                })}
              </ol>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

export function BusinessPlanPanel() {
  const today = todayStr()
  const now = currentPhase(today)
  const planDeadline = getCurrentPlanDeadline(today)
  const remain = daysUntil(planDeadline.date, today)
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set([now.id]))

  const progressIndex = useMemo(() => {
    const i = PLAN_PHASES.findIndex((p) => p.id === now.id)
    return Math.max(0, i)
  }, [now.id])

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const expandAll = () => setOpenIds(new Set(PLAN_PHASES.map((p) => p.id)))
  const collapseToNow = () => setOpenIds(new Set([now.id]))

  return (
    <div className="biz-plan">
      <section className="panel biz-plan-hero">
        <p className="biz-plan-eyebrow">2032 Exit</p>
        <h2 className="biz-plan-goal-title">売却 {PLAN_GOAL.salePrice}</h2>
        <p className="biz-plan-goal-sub">
          {PLAN_GOAL.takeHome} · アンカー {PLAN_GOAL.profitAnchor}
        </p>
        <p className="muted small biz-plan-path">{PLAN_GOAL.path}</p>

        <div
          className="biz-plan-progress"
          role="img"
          aria-label={`フェーズ ${progressIndex + 1} / ${PLAN_PHASES.length}`}
        >
          {PLAN_PHASES.map((p, i) => (
            <span
              key={p.id}
              className={`biz-plan-progress-seg${i <= progressIndex ? ' is-on' : ''}${
                p.id === now.id ? ' is-current' : ''
              }`}
              title={`${p.code} ${p.theme}`}
            />
          ))}
        </div>
        <div className="biz-plan-progress-labels">
          <span>2026</span>
          <span>2029</span>
          <span>2032</span>
        </div>
      </section>

      <section className="panel biz-plan-now">
        <div className="biz-plan-now-top">
          <div>
            <p className="biz-plan-eyebrow">いまの位置</p>
            <h2>
              {now.code} · {now.theme}
            </h2>
          </div>
          <div className="biz-plan-countdown">
            <strong>{remain < 0 ? '期限超過' : `あと${remain}日`}</strong>
            <span className="muted small">{planDeadline.date}</span>
          </div>
        </div>
        <p className="biz-plan-now-gate">
          直近必達: <strong>{planDeadline.subtitle}</strong>
        </p>
        <p className="muted small">
          {planDeadline.date <= PLAN_NEAR_GATE.date
            ? `週の勝利条件: ${PLAN_NEAR_GATE.weekWin}`
            : `${planDeadline.phaseCode} · ${planDeadline.theme}`}
        </p>
        <p className="muted small" style={{ marginTop: '0.35rem' }}>
          接続: {PLAN_NEAR_GATE.bridge}
        </p>
      </section>

      <div className="biz-plan-toolbar">
        <span className="muted small">タイムライン（上→下）</span>
        <div className="row">
          <button type="button" className="btn sm ghost" onClick={collapseToNow}>
            いまだけ
          </button>
          <button type="button" className="btn sm ghost" onClick={expandAll}>
            全部開く
          </button>
        </div>
      </div>

      <div className="biz-plan-rail">
        {PLAN_PHASES.map((phase) => (
          <PhaseBlock
            key={phase.id}
            phase={phase}
            today={today}
            open={openIds.has(phase.id)}
            onToggle={() => toggle(phase.id)}
          />
        ))}
      </div>
    </div>
  )
}
