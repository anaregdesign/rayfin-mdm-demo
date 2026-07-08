import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface GlossaryTerm {
  term: string;
  reading: string;
  description: string;
}

interface Feature {
  tab: string;
  to: string;
  summary: string;
}

interface WorkflowStep {
  title: string;
  detail: string;
  note?: string;
  links: { to: string; label: string }[];
}

interface RoleRow {
  label: string;
  reading: string;
  can: string;
}

interface QuickLink {
  to: string;
  label: string;
  description: string;
}

const RISKS: string[] = [
  '部門やシステムごとに顧客・製品データが分散し、表記ゆれ・重複・欠損が生まれる。',
  'どのレコードが正しいのか判断できず、集計・分析・請求・出荷の精度が落ちる。',
  '同じ顧客を別々に扱ってしまい、与信・コンプライアンス・顧客体験のリスクが高まる。',
  '責任者（データスチュワード）や変更履歴が曖昧で、ガバナンスと監査が効かない。',
];

const BENEFITS: { title: string; detail: string }[] = [
  {
    title: '単一の情報源',
    detail:
      '全部門・全システムが同じ正しいマスタを参照でき、意思決定が速く正確になる。',
  },
  {
    title: '品質の可視化と是正',
    detail:
      '欠損・表記ゆれ・重複を数値で把握し、継続的に改善するサイクルを回せる。',
  },
  {
    title: 'ガバナンスと監査',
    detail:
      '誰が・いつ・何を変えたかを記録し、承認フローで統制を効かせられる。',
  },
  {
    title: '下流連携の自動化',
    detail:
      'マスタの変更を配信イベントとして下流システムへ確実に届けられる。',
  },
];

const GLOSSARY: GlossaryTerm[] = [
  {
    term: 'マスタデータ',
    reading: 'Master Data',
    description:
      '顧客・製品・組織など、業務で繰り返し参照される中核的な基準データ。取引データ（受注・出荷など）と区別される。',
  },
  {
    term: 'ゴールデンレコード',
    reading: 'Golden Record',
    description:
      '複数ソースの情報を統合・名寄せして作られる、最も信頼できる単一の正データ。',
  },
  {
    term: '単一の情報源',
    reading: 'Single Source of Truth',
    description: '全システムが同じ正データを参照する状態。MDMが目指す到達点。',
  },
  {
    term: 'データスチュワード',
    reading: 'Data Steward',
    description:
      'マスタの品質と正しさに責任を持つ管理担当者。各レコードに割り当てる。',
  },
  {
    term: '名寄せ / 重複統合',
    reading: 'Matching / Dedup',
    description:
      '名称・コード・メール等を正規化して比較し、同一実体の重複候補を検出・統合すること。',
  },
  {
    term: 'ライフサイクル',
    reading: 'Lifecycle',
    description:
      'レコードの状態遷移（下書き→有効→無効→アーカイブ）。運用ルールに沿って管理する。',
  },
  {
    term: '承認フロー',
    reading: 'Maker-Checker',
    description:
      '申請者（メーカー）の変更を、別の承認者（チェッカー）が確認して初めて反映する統制方式。',
  },
  {
    term: '配信 / アウトボックス',
    reading: 'Distribution / Outbox',
    description:
      'マスタの変更を配信イベントとして蓄積し、下流システムへ順番に連携する仕組み。',
  },
];

const FEATURES: Feature[] = [
  {
    tab: 'ダッシュボード',
    to: '/',
    summary:
      '件数・品質分布・ステータス内訳・品質トレンド・構成分析・重複候補・是正状況を一望。低品質カードからドリルダウンでき、CSV／印刷レポートも出力できます。',
  },
  {
    tab: 'BIレポート',
    to: '/report',
    summary:
      'マスタデータ上に作成した Power BI レポートを埋め込み表示。ダッシュボードの集計に加えて、対話的な分析・ドリルダウンを行えます（レポート未接続時は接続手順を案内）。',
  },
  {
    tab: '顧客マスタ',
    to: '/customers',
    summary:
      '顧客の一覧・検索・並び替え・フィルタ、新規登録／編集、CSVエクスポートと一括インポート、360°の詳細ビュー。',
  },
  {
    tab: '製品マスタ',
    to: '/products',
    summary:
      '製品の一覧・検索・登録／編集に加え、カテゴリ・価格・単位などを管理。顧客マスタと同様にCSVで入出力できます。',
  },
  {
    tab: 'カテゴリ管理',
    to: '/categories',
    summary:
      '製品マスタが参照するカテゴリ階層を管理。階層はダッシュボードのドリルダウン集計や一覧の絞り込みに使われます。',
  },
  {
    tab: 'ワークキュー',
    to: '/workqueue',
    summary:
      'スチュワードが対応すべきレコードを、検出理由（品質・重複・下書き滞留・必須未入力）と優先度つきで一覧。編集・統合へワンクリックで遷移します。',
  },
  {
    tab: '是正キュー',
    to: '/remediation',
    summary:
      '表記ゆれの標準化候補、品質スコアの低いレコード、必須項目が未入力のレコードを一覧。標準化候補はワンクリックで適用できます。',
  },
  {
    tab: '配信・連携',
    to: '/distribution',
    summary:
      'マスタの変更を配信イベント（アウトボックス）として記録し、下流システムへ連携。イベントの確認・手動配信、有効レコードのCSV/JSONエクスポート、Webhook配信先の設定ができます。',
  },
  {
    tab: '承認',
    to: '/approvals',
    summary:
      'マスタの登録・編集の申請を確認し、承認または却下します（メーカーチェッカー）。',
  },
];

const WORKFLOWS: WorkflowStep[] = [
  {
    title: '① 全体像を掴む',
    detail:
      'まず「ダッシュボード」で件数・品質・重複・是正の状況を確認し、対応が必要な領域を把握します。',
    links: [{ to: '/', label: 'ダッシュボードを開く' }],
  },
  {
    title: '② マスタを探す・見る',
    detail:
      '「顧客マスタ」または「製品マスタ」で検索・フィルタ・並び替えを使い、対象レコードを絞り込んで詳細を確認します。',
    links: [
      { to: '/customers', label: '顧客マスタを開く' },
      { to: '/products', label: '製品マスタを開く' },
    ],
  },
  {
    title: '③ 登録・編集する',
    detail:
      '「新規登録」から追加、または詳細画面の「編集」から更新します。必須項目はその場で検証されます。',
    note: '承認フロー（デモ）を有効にしている場合、保存は直接反映されず「承認」タブへの申請になります。',
    links: [
      { to: '/customers/new', label: '顧客を新規登録' },
      { to: '/products/new', label: '製品を新規登録' },
    ],
  },
  {
    title: '④ まとめて取り込む',
    detail:
      '既存データはCSVで一括インポートできます。一覧画面の取込から、既存キーの扱い（スキップ／更新）を選んで登録します。',
    links: [
      { to: '/customers', label: '顧客をCSV取込' },
      { to: '/products', label: '製品をCSV取込' },
    ],
  },
  {
    title: '⑤ 品質を確認・是正する',
    detail:
      '詳細画面の品質スコアで不足項目を確認し、補完します。「是正キュー」では表記ゆれの標準化候補をワンクリックで適用できます。',
    links: [
      { to: '/remediation', label: '是正キューを開く' },
      { to: '/customers', label: '顧客の品質を確認' },
    ],
  },
  {
    title: '⑥ 重複を名寄せする',
    detail:
      'ダッシュボードやワークキューの重複候補から、同一実体と思われるペアを確認し、正しいゴールデンレコードへ統合します。',
    links: [
      { to: '/', label: 'ダッシュボードで重複候補を見る' },
      { to: '/workqueue', label: 'ワークキューを開く' },
    ],
  },
  {
    title: '⑦ 承認する',
    detail:
      '承認フローが有効なとき、申請された登録・編集を「承認」タブで確認し、承認または却下します。',
    links: [{ to: '/approvals', label: '承認タブを開く' }],
  },
  {
    title: '⑧ 下流へ配信する',
    detail:
      '確定したマスタの変更を「配信・連携」で下流システムへ届けます。配信イベントの確認・手動配信やCSV/JSONエクスポートができます。',
    links: [{ to: '/distribution', label: '配信・連携を開く' }],
  },
];

const ROLES: RoleRow[] = [
  {
    label: '閲覧者',
    reading: 'viewer',
    can: '閲覧のみ。機微項目は非表示になります。',
  },
  {
    label: 'データスチュワード',
    reading: 'steward',
    can: '担当レコードの編集・統合・状態変更に加え、新規登録・CSV取込ができます。',
  },
  {
    label: '管理者',
    reading: 'admin',
    can: '承認・削除を含むすべての操作ができます。',
  },
];

const QUICK_LINKS: QuickLink[] = [
  { to: '/', label: 'ダッシュボード', description: '品質・重複・件数・トレンドの全体像' },
  { to: '/report', label: 'BIレポート', description: 'Power BI レポートの埋め込み表示' },
  { to: '/customers', label: '顧客マスタ', description: '顧客レコードの検索・登録・取込' },
  { to: '/products', label: '製品マスタ', description: '製品レコードの検索・登録・取込' },
  { to: '/categories', label: 'カテゴリ管理', description: '製品カテゴリ階層の管理' },
  { to: '/workqueue', label: 'ワークキュー', description: '対応すべきレコードの一覧' },
  { to: '/remediation', label: '是正キュー', description: '標準化・低品質・未入力の是正' },
  { to: '/distribution', label: '配信・連携', description: '下流連携とエクスポート' },
  { to: '/approvals', label: '承認', description: '登録・編集申請の承認／却下' },
];

const QUALITY_LEVELS: { label: string; color: string; note: string }[] = [
  {
    label: '高 (80%以上)',
    color: 'bg-emerald-500',
    note: '必須・推奨項目が十分に充足',
  },
  {
    label: '中 (50〜79%)',
    color: 'bg-amber-500',
    note: '一部項目が未入力。補完を推奨',
  },
  {
    label: '低 (50%未満)',
    color: 'bg-rose-500',
    note: '重要項目が不足。優先的に是正',
  },
];

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

/** Inline pill link to an in-app route (private presentational helper). */
function GuideLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100"
    >
      {label}
      <span aria-hidden>→</span>
    </Link>
  );
}

/**
 * Static explanatory guide (presentational only). Introduces MDM concepts, maps
 * every sidebar tab to what it does, and walks through the basic workflow.
 * Holds no state and calls no ports.
 */
export function GuideContent() {
  return (
    <div className="space-y-10">
      <Section
        title="マスタデータ管理（MDM）とは"
        description="Master Data Management"
      >
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm leading-relaxed text-slate-600">
            マスタデータ管理（MDM）とは、顧客・製品といった業務の中核となる
            <span className="font-medium text-slate-900">基準データ（マスタ）</span>
            を組織横断で一元的に整備し、正確・一貫・最新な
            <span className="font-medium text-slate-900">「単一の情報源」</span>
            として維持する取り組みです。分散・重複したデータを名寄せして
            <span className="font-medium text-slate-900">ゴールデンレコード</span>
            を作り、品質・ガバナンス・ライフサイクルを継続的に管理します。
            このアプリは、そのMDMの一連の流れを小さく体験できるPoCです。
          </p>
        </div>
      </Section>

      <Section
        title="なぜMDMが大切か"
        description="マスタの乱れが招くリスクと、MDMがもたらす価値"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-rose-200 bg-rose-50/40 p-5">
            <h3 className="text-sm font-semibold text-rose-800">
              マスタが乱れると起きること
            </h3>
            <ul className="mt-3 space-y-2">
              {RISKS.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-slate-600"
                >
                  <span className="mt-0.5 text-rose-500" aria-hidden>
                    ●
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-5">
            <h3 className="text-sm font-semibold text-emerald-800">
              MDMがもたらす価値
            </h3>
            <ul className="mt-3 space-y-3">
              {BENEFITS.map((b) => (
                <li key={b.title} className="text-sm text-slate-600">
                  <span className="flex items-start gap-2">
                    <span className="mt-0.5 text-emerald-600" aria-hidden>
                      ✓
                    </span>
                    <span>
                      <span className="font-medium text-slate-900">
                        {b.title}
                      </span>
                      <span className="text-slate-400">｜</span>
                      {b.detail}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section title="主要な用語" description="MDMの基本概念">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {GLOSSARY.map((g) => (
            <div
              key={g.term}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex items-baseline gap-2">
                <h3 className="text-sm font-semibold text-slate-900">
                  {g.term}
                </h3>
                <span className="text-xs text-slate-400">{g.reading}</span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                {g.description}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="このアプリの全体像"
        description="左のメニュー（タブ）ごとの役割。名前をクリックすると開けます"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {FEATURES.map((f) => (
            <div
              key={f.tab}
              className="flex flex-col rounded-lg border border-slate-200 bg-white p-4"
            >
              <Link
                to={f.to}
                className="w-fit text-sm font-semibold text-indigo-700 hover:underline"
              >
                {f.tab}
                <span aria-hidden> →</span>
              </Link>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                {f.summary}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="はじめての操作（クイックスタート）" description="基本的な運用フロー">
        <ol className="space-y-3">
          {WORKFLOWS.map((step) => (
            <li
              key={step.title}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <h3 className="text-sm font-semibold text-slate-900">
                {step.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                {step.detail}
              </p>
              {step.note && (
                <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
                  {step.note}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {step.links.map((link) => (
                  <GuideLink
                    key={`${link.to}-${link.label}`}
                    to={link.to}
                    label={link.label}
                  />
                ))}
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        title="ロールと承認フロー"
        description="操作できる範囲は、ロールと承認モードで変わります"
      >
        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            {ROLES.map((r, i) => (
              <div
                key={r.reading}
                className={`flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:gap-4 ${
                  i > 0 ? 'border-t border-slate-100' : ''
                }`}
              >
                <div className="flex w-full items-baseline gap-2 sm:w-52 sm:shrink-0">
                  <span className="text-sm font-semibold text-slate-900">
                    {r.label}
                  </span>
                  <span className="text-xs text-slate-400">{r.reading}</span>
                </div>
                <span className="text-sm text-slate-600">{r.can}</span>
              </div>
            ))}
          </div>
          <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-600">
            <span className="font-medium text-slate-900">
              サイドバー下部のスイッチ（デモ用）
            </span>
            で、ロールの切り替えと
            <span className="font-medium text-slate-900">承認フロー</span>
            のオン／オフを試せます。承認フローを有効にすると、登録・編集は直接保存されず
            <Link
              to="/approvals"
              className="text-indigo-700 underline decoration-dotted hover:text-indigo-900"
            >
              「承認」タブ
            </Link>
            への申請となり、承認されて初めて反映されます。
          </p>
        </div>
      </Section>

      <Section title="データ品質スコアの見方" description="レコードの完全性を色で表現">
        <div className="space-y-2">
          {QUALITY_LEVELS.map((level) => (
            <div
              key={level.label}
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4"
            >
              <span
                className={`h-3 w-3 shrink-0 rounded-full ${level.color}`}
                aria-hidden
              />
              <span className="text-sm font-medium text-slate-900">
                {level.label}
              </span>
              <span className="text-sm text-slate-500">{level.note}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="主要ページへのショートカット"
        description="ガイドから直接ページへ移動できます"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_LINKS.map((q) => (
            <Link
              key={`${q.to}-${q.label}`}
              to={q.to}
              className="group flex flex-col rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-indigo-300 hover:bg-indigo-50/50"
            >
              <span className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700">
                {q.label}
                <span aria-hidden> →</span>
              </span>
              <span className="mt-1 text-xs text-slate-500">
                {q.description}
              </span>
            </Link>
          ))}
        </div>
      </Section>
    </div>
  );
}
