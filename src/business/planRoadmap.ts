/** 起業スペース用・2032逆算ロードマップ（静的。計画の正はメモ側） */

export type PlanStatus = 'done' | 'now' | 'next' | 'later'

export interface PlanMonth {
  id: string
  label: string
  /** yyyy-MM for ordering / status */
  month: string
  must: string[]
  stretch?: string[]
  gate?: string
}

export interface PlanPhase {
  id: string
  code: string
  period: string
  /** inclusive start yyyy-MM */
  start: string
  /** inclusive end yyyy-MM */
  end: string
  theme: string
  gates: string[]
  focus: string
  stockHint: string
  months?: PlanMonth[]
}

export const PLAN_GOAL = {
  deadline: '2032年末',
  salePrice: '2.5億円',
  takeHome: '手元 roughly 2.0億円',
  profitAnchor: '営業利益 roughly 8,000万円/年',
  path: '制作（入口）→ 継続課金（本丸）→ 仕組み化して売却',
} as const

export const PLAN_NEAR_GATE = {
  date: '2026-09-30',
  label: '制作累計≥9万円（3件×3万目安）',
  weekWin: '商談 or 見積 → クローズ',
  bridge:
    '12/31制作≥18万 → 2027/6制作≥36万＋ストック15万 → 2027/12ストック40万',
} as const

export const PLAN_PHASES: PlanPhase[] = [
  {
    id: 'p0',
    code: 'P0',
    period: '2026下期',
    start: '2026-08',
    end: '2026-12',
    theme: 'ゼロイチ点火',
    gates: [
      '中間: 2026-09-30 制作累計≥9万',
      '期末: 制作累計≥18万（伸≥27万＝P1余裕）',
      '意味: 約6件はP1ストック15万（継続3）の最低パイプライン',
    ],
    focus: '制作9→18万。毎月新規≥3万。値上げ・採用はしない',
    stockHint: '0 → ごく小',
    months: [
      {
        id: '2026-08',
        label: '8月',
        month: '2026-08',
        must: [
          '週の勝利条件 = 商談 or 見積',
          '返信は48時間以内に日程取り or 見積',
          'KPI実測（DM/返信/商談/見積/受注）',
          '進捗板を作る',
        ],
        stretch: ['見積≥2', '受注1'],
        gate: '月末: 商談or見積 ≥2',
      },
      {
        id: '2026-09',
        label: '9月',
        month: '2026-09',
        must: [
          '制作累計≥9万',
          '週ごとに受注残を逆算',
          'モニター〜3万帯でクローズ優先',
        ],
        stretch: ['4件目', '継続の仮約束1'],
        gate: '累計≥9万',
      },
      {
        id: '2026-10',
        label: '10月',
        month: '2026-10',
        must: [
          '当月新規≥3万 / 累計≥12万',
          '納品・実績化を進める',
          '週商談or見積≥1',
        ],
        stretch: ['当月新規≥6万 / 累計≥15万'],
        gate: '累計≥12万',
      },
      {
        id: '2026-11',
        label: '11月',
        month: '2026-11',
        must: [
          '当月新規≥3万 / 累計≥15万',
          '商談の型を標準化',
          '失注理由ログ',
        ],
        stretch: ['当月新規≥6万', '公開実績1'],
        gate: '累計≥15万',
      },
      {
        id: '2026-12',
        label: '12月',
        month: '2026-12',
        must: [
          '制作累計≥18万（P1の最低パイプライン）',
          '当月新規≥3万',
          '継続提案文ドラフト',
        ],
        stretch: ['制作累計≥27万'],
        gate: '累計≥18万',
      },
    ],
  },
  {
    id: 'p1',
    code: 'P1',
    period: '2027上期',
    start: '2027-01',
    end: '2027-06',
    theme: '制作36万＋ストック15万',
    gates: [
      '制作累計≥36万（P0の18万から+18万）',
      '公開実績≥2 / 継続提案率≥80%',
      '継続≥3 / ストック月商≥15万',
    ],
    focus: '納品から継続へ転換。制作は毎月+3万ペース',
    stockHint: '~15万',
    months: [
      {
        id: '2027-01',
        label: '1月',
        month: '2027-01',
        must: ['制作累計≥21万', '納品進行', '商談維持'],
        gate: '累計≥21万',
      },
      {
        id: '2027-02',
        label: '2月',
        month: '2027-02',
        must: ['制作累計≥24万', '継続案を仮提示できる'],
        gate: '累計≥24万',
      },
      {
        id: '2027-03',
        label: '3月',
        month: '2027-03',
        must: ['制作累計≥27万', 'ストック≥5万（継続≥1）'],
        gate: '累計≥27万 / ストック≥5万',
      },
      {
        id: '2027-04',
        label: '4月',
        month: '2027-04',
        must: ['制作累計≥30万', '公開実績1', '継続提案の計測開始'],
        gate: '累計≥30万',
      },
      {
        id: '2027-05',
        label: '5月',
        month: '2027-05',
        must: ['制作累計≥33万', '継続≥2 / ストック≥8万', '全納品で継続提案'],
        gate: 'ストック≥8万',
      },
      {
        id: '2027-06',
        label: '6月',
        month: '2027-06',
        must: ['制作累計≥36万', '継続≥3 / ストック≥15万'],
        gate: 'P1終了',
      },
    ],
  },
  {
    id: 'p2',
    code: 'P2',
    period: '2027下期',
    start: '2027-07',
    end: '2027-12',
    theme: 'ストック15万→40万',
    gates: [
      '継続≥8 / ストック月商≥40万',
      'ARPU≥5万設計へ移行開始',
      '制作チェックリスト完成',
    ],
    focus: '伴走パッケージ標準装備。制作は月+3〜6万で燃料補給',
    stockHint: '~40万',
    months: [
      {
        id: '2027-07',
        label: '7月',
        month: '2027-07',
        must: ['ストック≥20万', '継続商品を1つに固定', '制作新規≥3万'],
        gate: 'ストック≥20万',
      },
      {
        id: '2027-08',
        label: '8月',
        month: '2027-08',
        must: ['ストック≥25万', '解約理由を必ず記録'],
        gate: 'ストック≥25万',
      },
      {
        id: '2027-09',
        label: '9月',
        month: '2027-09',
        must: ['ストック≥30万', '5万以上継続の提案を複数'],
        gate: 'ストック≥30万',
      },
      {
        id: '2027-10',
        label: '10月',
        month: '2027-10',
        must: ['ストック≥35万', '管理表を1つに'],
        gate: 'ストック≥35万',
      },
      {
        id: '2027-11',
        label: '11月',
        month: '2027-11',
        must: ['ストック≥38万', '継続≥7視野'],
        gate: 'ストック≥38万',
      },
      {
        id: '2027-12',
        label: '12月',
        month: '2027-12',
        must: ['ストック≥40万', '継続≥8'],
        stretch: ['ストック≥50万'],
        gate: 'P2終了',
      },
    ],
  },
  {
    id: 'p3',
    code: 'P3',
    period: '2028上期',
    start: '2028-01',
    end: '2028-06',
    theme: '単価と再現性',
    gates: ['ストック≥90万', '制作中心単価10〜15万帯', '紹介or実績経由の芽'],
    focus: '安い制作依存からの脱出',
    stockHint: '~90万',
  },
  {
    id: 'p4',
    code: 'P4',
    period: '2028下期',
    start: '2028-07',
    end: '2028-12',
    theme: '仕組み化の着手',
    gates: ['ストック≥180万', '外注/委任の一部', '手順書揃え', '制作実作業≤60%'],
    focus: 'マニュアルと委任',
    stockHint: '~180万',
  },
  {
    id: 'p5',
    code: 'P5',
    period: '2029上期',
    start: '2029-01',
    end: '2029-06',
    theme: 'ディレクター化',
    gates: ['ストック≥300万', '制作実作業≤40%', '上位3顧客依存≤40%'],
    focus: '提案・品質・顧客成功に寄せる',
    stockHint: '~300万',
  },
  {
    id: 'p6',
    code: 'P6',
    period: '2029下期',
    start: '2029-07',
    end: '2029-12',
    theme: '高ARPU化',
    gates: ['ストック≥450万', 'ARPU中央値≥8万', '高単価層≥20%'],
    focus: '顧客層シフト（個人店一辺倒を減らす）',
    stockHint: '~450万',
  },
  {
    id: 'p7',
    code: 'P7',
    period: '2030上期',
    start: '2030-01',
    end: '2030-06',
    theme: 'スケール前半',
    gates: ['ストック≥650万', '年商ランレート≥1.2億', '利益ランレート≥3,000万'],
    focus: '営業の属人排除',
    stockHint: '~650万',
  },
  {
    id: 'p8',
    code: 'P8',
    period: '2030下期',
    start: '2030-07',
    end: '2030-12',
    theme: '生死判定',
    gates: ['ストック≥800万', '利益≥4,000万', '足りなければ期限/金額を改訂'],
    focus: '2.5億ルートの中間判定',
    stockHint: '~800万',
  },
  {
    id: 'p9',
    code: 'P9',
    period: '2031上期',
    start: '2031-01',
    end: '2031-06',
    theme: 'Exit仕様の整備',
    gates: ['ストック≥1,000万', '利益≥5,500万', 'DD可能な状態', '社長不在シミュレーション'],
    focus: '買い手に見せられる会社にする',
    stockHint: '~1,000万',
  },
  {
    id: 'p10',
    code: 'P10',
    period: '2031下期',
    start: '2031-07',
    end: '2031-12',
    theme: '売却プロセス',
    gates: ['利益≥7,000万（理想8,000万）', '複数候補と接触', '2.5億の根拠資料'],
    focus: '交渉と条件設計',
    stockHint: '~1,200万+',
  },
  {
    id: 'p11',
    code: 'P11',
    period: '2032',
    start: '2032-01',
    end: '2032-12',
    theme: 'クロージング',
    gates: ['利益≥7,000万（目標8,000万）', '売却契約（2.5億前後）', '税務確認済み'],
    focus: '合意と手元約2億',
    stockHint: '~1,350万',
  },
]

function ymNow(today: string): string {
  return today.slice(0, 7)
}

export function phaseStatus(phase: PlanPhase, today: string): PlanStatus {
  const ym = ymNow(today)
  if (ym > phase.end) return 'done'
  if (ym >= phase.start && ym <= phase.end) return 'now'
  const idx = PLAN_PHASES.findIndex((p) => p.id === phase.id)
  const current = PLAN_PHASES.find((p) => ym >= p.start && ym <= p.end)
  if (!current) {
    if (ym < PLAN_PHASES[0].start) return phase.id === PLAN_PHASES[0].id ? 'next' : 'later'
    return 'later'
  }
  const curIdx = PLAN_PHASES.findIndex((p) => p.id === current.id)
  if (idx === curIdx + 1) return 'next'
  return 'later'
}

export function monthStatus(month: string, today: string): PlanStatus {
  const ym = ymNow(today)
  if (month < ym) return 'done'
  if (month === ym) return 'now'
  const [y, m] = ym.split('-').map(Number)
  const next =
    m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
  if (month === next) return 'next'
  return 'later'
}

export function daysUntil(targetDate: string, today: string): number {
  const a = new Date(`${today}T12:00:00`)
  const b = new Date(`${targetDate}T12:00:00`)
  return Math.ceil((b.getTime() - a.getTime()) / 86400000)
}

export function currentPhase(today: string): PlanPhase {
  const ym = ymNow(today)
  return (
    PLAN_PHASES.find((p) => ym >= p.start && ym <= p.end) ?? PLAN_PHASES[0]
  )
}

/** yyyy-MM → その月の末日 yyyy-MM-dd */
export function lastDayOfMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const day = new Date(y, m, 0).getDate()
  return `${ym}-${String(day).padStart(2, '0')}`
}

export interface PlanDeadline {
  id: string
  date: string
  start: string
  phaseCode: string
  theme: string
  /** ゲージ・いまの位置用の短い説明 */
  subtitle: string
}

/** 計画上の期限一覧（時系列）。日付が進むと「いま」の期限が次へ移る */
export function listPlanDeadlines(): PlanDeadline[] {
  const list: PlanDeadline[] = []
  for (const phase of PLAN_PHASES) {
    if (phase.months?.length) {
      for (const mo of phase.months) {
        const date =
          mo.month === '2026-09' ? PLAN_NEAR_GATE.date : lastDayOfMonth(mo.month)
        list.push({
          id: mo.id,
          date,
          start: `${mo.month}-01`,
          phaseCode: phase.code,
          theme: phase.theme,
          subtitle: mo.gate ?? mo.must[0] ?? phase.focus,
        })
      }
    } else {
      list.push({
        id: phase.id,
        date: lastDayOfMonth(phase.end),
        start: `${phase.start}-01`,
        phaseCode: phase.code,
        theme: phase.theme,
        subtitle: phase.gates[0] ?? phase.focus,
      })
    }
  }
  return list
}

/**
 * 今日時点の「いまの位置」期限。
 * 今日以降で最も近いゲート。すべて過ぎていれば最後のゲート（超過表示用）。
 */
export function getCurrentPlanDeadline(today: string): PlanDeadline {
  const all = listPlanDeadlines()
  return all.find((d) => d.date >= today) ?? all[all.length - 1]
}
