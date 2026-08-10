import { useMemo, useState } from 'react'
import { useHub } from '../store'
import type { Client, ClientStatus, SnsWeekLog } from '../types'
import { CLIENT_STATUS_LABEL } from '../types'
import { BusinessPlanPanel } from './BusinessPlanPanel'
import {
  dmCountOn,
  dmCountThisWeek,
  sundayOf,
  todayStr,
  weekRangeLabel,
} from './helpers'

type Tab = 'dm' | 'week' | 'clients' | 'ig' | 'plan'

const emptySns = (): Omit<SnsWeekLog, 'id'> => ({
  weekStart: sundayOf(todayStr()),
  instagram: { views: 0, reach: 0, profileAccess: 0, linkTaps: 0 },
  sales: { dmSent: 0, replies: 0, meetings: 0, orders: 0 },
  notes: '',
})

export function BusinessPanel() {
  const business = useHub((s) => s.business)
  const bumpDm = useHub((s) => s.bumpDm)
  const setBusinessGoals = useHub((s) => s.setBusinessGoals)
  const saveSnsWeek = useHub((s) => s.saveSnsWeek)
  const deleteSnsWeek = useHub((s) => s.deleteSnsWeek)
  const saveClient = useHub((s) => s.saveClient)
  const deleteClient = useHub((s) => s.deleteClient)
  const saveIg = useHub((s) => s.saveIg)
  const deleteIg = useHub((s) => s.deleteIg)

  const [tab, setTab] = useState<Tab>('dm')
  const [snsForm, setSnsForm] = useState(emptySns)
  const [editingSnsId, setEditingSnsId] = useState<string | null>(null)
  const [clientForm, setClientForm] = useState({
    id: '' as string | undefined,
    name: '',
    status: 'lead' as ClientStatus,
    projectFee: 0,
    recurringFee: 0,
    memo: '',
  })
  const [igForm, setIgForm] = useState({
    id: '' as string | undefined,
    instagramId: '',
    name: '',
    memo: '',
  })
  const [igQuery, setIgQuery] = useState('')
  const [msg, setMsg] = useState('')

  const today = todayStr()
  const todayDm = dmCountOn(business.salesLogs, today)
  const weekDm = dmCountThisWeek(business.salesLogs)

  const filteredIg = useMemo(() => {
    const q = igQuery.trim().toLowerCase()
    if (!q) return business.igList
    return business.igList.filter(
      (g) =>
        g.instagramId.toLowerCase().includes(q) ||
        g.name.toLowerCase().includes(q) ||
        g.memo.toLowerCase().includes(q),
    )
  }, [business.igList, igQuery])

  const activeClients = business.clients.filter((c) => c.status !== 'closed')
  const projectSum = activeClients.reduce((s, c) => s + (c.projectFee || 0), 0)
  const recurringSum = activeClients.reduce((s, c) => s + (c.recurringFee || 0), 0)

  return (
    <div className="biz">
      <div className="biz-tabs">
        {(
          [
            ['dm', 'DM'],
            ['week', '週次'],
            ['clients', '案件'],
            ['ig', 'IGリスト'],
            ['plan', '計画'],
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

      {tab === 'dm' && (
        <section className="panel">
          <h2>今日のDM</h2>
          <div className="dm-hero">
            <button type="button" className="btn ghost" onClick={() => bumpDm(-1)}>
              −
            </button>
            <div className="dm-hero-count">
              <strong>{todayDm}</strong>
              <span className="muted small">/ {business.dmDailyGoal}</span>
            </div>
            <button type="button" className="btn" onClick={() => bumpDm(1)}>
              +1
            </button>
          </div>
          <p className="muted small" style={{ marginTop: '0.75rem' }}>
            今週 {weekDm} / {business.dmWeeklyGoal} 件
          </p>
          <div className="row" style={{ marginTop: '0.85rem' }}>
            <label className="field" style={{ flex: 1, marginBottom: 0 }}>
              <span>1日目標</span>
              <input
                className="input"
                type="number"
                min={1}
                value={business.dmDailyGoal}
                onChange={(e) =>
                  setBusinessGoals(Number(e.target.value) || 10, business.dmWeeklyGoal)
                }
              />
            </label>
            <label className="field" style={{ flex: 1, marginBottom: 0 }}>
              <span>週目標</span>
              <input
                className="input"
                type="number"
                min={1}
                value={business.dmWeeklyGoal}
                onChange={(e) =>
                  setBusinessGoals(business.dmDailyGoal, Number(e.target.value) || 80)
                }
              />
            </label>
          </div>
        </section>
      )}

      {tab === 'week' && (
        <>
          <section className="panel">
            <h2>{editingSnsId ? '週次を編集' : '週次記録'}</h2>
            <p className="muted small" style={{ marginTop: '-0.35rem' }}>
              商談 = Zoom/電話15分 OR 見積提示して検討中
            </p>
            <label className="field">
              <span>週（日曜）</span>
              <input
                className="input"
                type="date"
                value={snsForm.weekStart}
                onChange={(e) =>
                  setSnsForm((f) => ({ ...f, weekStart: sundayOf(e.target.value || today) }))
                }
              />
            </label>
            <p className="muted small">期間: {weekRangeLabel(snsForm.weekStart)}</p>
            <div className="kpi-grid">
              {(
                [
                  ['dmSent', 'DM送信'],
                  ['replies', '返信'],
                  ['meetings', '商談'],
                  ['orders', '受注'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="field">
                  <span>{label}</span>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={snsForm.sales[key]}
                    onChange={(e) =>
                      setSnsForm((f) => ({
                        ...f,
                        sales: { ...f.sales, [key]: Number(e.target.value) || 0 },
                      }))
                    }
                  />
                </label>
              ))}
            </div>
            <div className="kpi-grid">
              {(
                [
                  ['views', '閲覧'],
                  ['reach', 'リーチ'],
                  ['profileAccess', 'プロフ'],
                  ['linkTaps', 'リンク'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="field">
                  <span>IG {label}</span>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={snsForm.instagram[key]}
                    onChange={(e) =>
                      setSnsForm((f) => ({
                        ...f,
                        instagram: {
                          ...f.instagram,
                          [key]: Number(e.target.value) || 0,
                        },
                      }))
                    }
                  />
                </label>
              ))}
            </div>
            <label className="field">
              <span>メモ</span>
              <textarea
                className="input"
                rows={2}
                value={snsForm.notes}
                onChange={(e) => setSnsForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </label>
            <div className="row">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  saveSnsWeek({
                    ...snsForm,
                    id: editingSnsId || undefined,
                  })
                  setSnsForm(emptySns())
                  setEditingSnsId(null)
                  setMsg('週次を保存しました')
                }}
              >
                保存
              </button>
              {editingSnsId ? (
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => {
                    setEditingSnsId(null)
                    setSnsForm(emptySns())
                  }}
                >
                  新規に戻す
                </button>
              ) : null}
            </div>
          </section>
          <section className="panel">
            <h2>保存済みの週</h2>
            {business.snsLogs.length === 0 ? (
              <div className="empty">まだ週次記録がありません</div>
            ) : (
              business.snsLogs.slice(0, 8).map((log) => (
                <div key={log.id} className="metric-card">
                  <div>
                    <strong>{weekRangeLabel(log.weekStart)}</strong>
                    <div className="muted small">
                      DM {log.sales.dmSent} / 返信 {log.sales.replies} / 商談{' '}
                      {log.sales.meetings} / 受注 {log.sales.orders}
                    </div>
                  </div>
                  <div className="row">
                    <button
                      type="button"
                      className="btn sm ghost"
                      onClick={() => {
                        setEditingSnsId(log.id)
                        setSnsForm({
                          weekStart: log.weekStart,
                          instagram: { ...log.instagram },
                          sales: { ...log.sales },
                          notes: log.notes,
                        })
                      }}
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      className="btn sm danger"
                      onClick={() => deleteSnsWeek(log.id)}
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))
            )}
          </section>
        </>
      )}

      {tab === 'clients' && (
        <>
          <section className="panel">
            <h2>案件サマリ</h2>
            <p className="muted small">
              進行中相当 {activeClients.length} 件 · 制作費合計 ¥
              {projectSum.toLocaleString()} · 月額合計 ¥{recurringSum.toLocaleString()}
            </p>
            <label className="field">
              <span>名前</span>
              <input
                className="input"
                value={clientForm.name}
                onChange={(e) => setClientForm((f) => ({ ...f, name: e.target.value }))}
              />
            </label>
            <label className="field">
              <span>ステータス</span>
              <select
                className="input"
                value={clientForm.status}
                onChange={(e) =>
                  setClientForm((f) => ({
                    ...f,
                    status: e.target.value as ClientStatus,
                  }))
                }
              >
                {(Object.keys(CLIENT_STATUS_LABEL) as ClientStatus[]).map((k) => (
                  <option key={k} value={k}>
                    {CLIENT_STATUS_LABEL[k]}
                  </option>
                ))}
              </select>
            </label>
            <div className="kpi-grid">
              <label className="field">
                <span>制作費</span>
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={clientForm.projectFee}
                  onChange={(e) =>
                    setClientForm((f) => ({
                      ...f,
                      projectFee: Number(e.target.value) || 0,
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>月額</span>
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={clientForm.recurringFee}
                  onChange={(e) =>
                    setClientForm((f) => ({
                      ...f,
                      recurringFee: Number(e.target.value) || 0,
                    }))
                  }
                />
              </label>
            </div>
            <label className="field">
              <span>メモ</span>
              <textarea
                className="input"
                rows={2}
                value={clientForm.memo}
                onChange={(e) => setClientForm((f) => ({ ...f, memo: e.target.value }))}
              />
            </label>
            <div className="row">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  saveClient({
                    id: clientForm.id,
                    name: clientForm.name,
                    status: clientForm.status,
                    projectFee: clientForm.projectFee,
                    recurringFee: clientForm.recurringFee,
                    memo: clientForm.memo,
                  })
                  setClientForm({
                    id: undefined,
                    name: '',
                    status: 'lead',
                    projectFee: 0,
                    recurringFee: 0,
                    memo: '',
                  })
                  setMsg('案件を保存しました')
                }}
              >
                保存
              </button>
            </div>
          </section>
          <section className="panel">
            <h2>一覧</h2>
            {business.clients.length === 0 ? (
              <div className="empty">案件はまだありません</div>
            ) : (
              business.clients.map((c: Client) => (
                <div key={c.id} className="metric-card">
                  <div>
                    <strong>{c.name}</strong>
                    <div className="muted small">
                      {CLIENT_STATUS_LABEL[c.status]} · ¥{c.projectFee.toLocaleString()}
                      {c.recurringFee ? ` / 月¥${c.recurringFee.toLocaleString()}` : ''}
                    </div>
                  </div>
                  <div className="row">
                    <button
                      type="button"
                      className="btn sm ghost"
                      onClick={() =>
                        setClientForm({
                          id: c.id,
                          name: c.name,
                          status: c.status,
                          projectFee: c.projectFee,
                          recurringFee: c.recurringFee,
                          memo: c.memo,
                        })
                      }
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      className="btn sm danger"
                      onClick={() => deleteClient(c.id)}
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))
            )}
          </section>
        </>
      )}

      {tab === 'plan' && <BusinessPlanPanel />}

      {tab === 'ig' && (
        <>
          <section className="panel">
            <h2>Instagramリスト</h2>
            <label className="field">
              <span>検索</span>
              <input
                className="input"
                value={igQuery}
                onChange={(e) => setIgQuery(e.target.value)}
                placeholder="ID / 名前 / メモ"
              />
            </label>
            <label className="field">
              <span>Instagram ID（@なし）</span>
              <input
                className="input"
                value={igForm.instagramId}
                onChange={(e) =>
                  setIgForm((f) => ({ ...f, instagramId: e.target.value }))
                }
              />
            </label>
            <label className="field">
              <span>名前</span>
              <input
                className="input"
                value={igForm.name}
                onChange={(e) => setIgForm((f) => ({ ...f, name: e.target.value }))}
              />
            </label>
            <label className="field">
              <span>メモ（状態タグなど）</span>
              <textarea
                className="input"
                rows={2}
                value={igForm.memo}
                onChange={(e) => setIgForm((f) => ({ ...f, memo: e.target.value }))}
                placeholder="例: DM済 / 返信あり / 再連絡2026-08-20"
              />
            </label>
            <div className="row">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  const err = saveIg({
                    id: igForm.id,
                    instagramId: igForm.instagramId,
                    name: igForm.name,
                    memo: igForm.memo,
                  })
                  if (err) {
                    setMsg(err)
                    return
                  }
                  setIgForm({ id: undefined, instagramId: '', name: '', memo: '' })
                  setMsg('リストに保存しました')
                }}
              >
                保存
              </button>
            </div>
          </section>
          <section className="panel">
            <h2>一覧（{filteredIg.length}）</h2>
            {filteredIg.length === 0 ? (
              <div className="empty">該当なし</div>
            ) : (
              filteredIg.map((g) => (
                <div key={g.id} className="metric-card">
                  <div>
                    <strong>@{g.instagramId}</strong>
                    <div className="muted small">
                      {g.name || '—'}
                      {g.memo ? ` · ${g.memo}` : ''}
                    </div>
                  </div>
                  <div className="row">
                    <button
                      type="button"
                      className="btn sm ghost"
                      onClick={() =>
                        setIgForm({
                          id: g.id,
                          instagramId: g.instagramId,
                          name: g.name,
                          memo: g.memo,
                        })
                      }
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      className="btn sm danger"
                      onClick={() => deleteIg(g.id)}
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))
            )}
          </section>
        </>
      )}

      {msg ? <p className="muted small">{msg}</p> : null}
    </div>
  )
}
