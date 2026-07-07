import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface GlossaryTerm {
  term: string;
  reading: string;
  description: string;
}

interface Capability {
  tab: string;
  title: string;
  description: string;
}

interface WorkflowStep {
  title: string;
  detail: string;
  links: { to: string; label: string }[];
}

const WHY_MDM: string[] = [
  '部門やシステムごとに顧客・製品データが分散し、表記ゆれや重複が発生する。',
  'どのレコードが正しいのか判断できず、集計・分析・請求の精度が下がる。',
  '責任者（データスチュワード）や更新履歴が曖昧で、ガバナンスが効かない。',
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
];

const CAPABILITIES: Capability[] = [
  {
    tab: 'ダッシュボード',
    title: '分析・可視化',
    description:
      '両マスタの件数、データ品質分布、ステータス内訳、重複候補、最近の更新を一目で把握。',
  },
  {
    tab: '顧客マスタ / 製品マスタ',
    title: 'データモデル & 登録',
    description:
      '顧客・製品エンティティの一覧・検索・並び替え、新規登録および編集をフォームから実施。',
  },
  {
    tab: '各レコード詳細',
    title: 'データ品質',
    description:
      '必須項目の検証と、レコードごとの完全性スコア（品質スコア）を自動算出して表示。',
  },
  {
    tab: 'ダッシュボード / 一覧',
    title: '名寄せ・重複検出',
    description:
      '名称・コード・メールを正規化して重複候補ペアを検出し、統合の判断を支援。',
  },
  {
    tab: '各レコード詳細',
    title: 'ガバナンス & 監査',
    description:
      'ステータス、担当スチュワード、作成者・更新者・作成日時・更新日時を記録・追跡。',
  },
];

const WORKFLOWS: WorkflowStep[] = [
  {
    title: '① 全体像を掴む',
    detail:
      'まず「ダッシュボード」で件数・品質・重複の状況を確認し、対応が必要な領域を把握します。',
    links: [{ to: '/', label: 'ダッシュボードを開く' }],
  },
  {
    title: '② マスタを探す',
    detail:
      '「顧客マスタ」または「製品マスタ」を開き、検索・フィルタ・並び替えで対象レコードを絞り込みます。',
    links: [
      { to: '/customers', label: '顧客マスタを開く' },
      { to: '/products', label: '製品マスタを開く' },
    ],
  },
  {
    title: '③ 登録・編集する',
    detail:
      '「新規登録」ボタンから追加、または詳細画面の「編集」から更新します。必須項目はその場で検証されます。',
    links: [
      { to: '/customers/new', label: '顧客を新規登録' },
      { to: '/products/new', label: '製品を新規登録' },
    ],
  },
  {
    title: '④ 品質を確認する',
    detail:
      '詳細画面で品質スコアと不足項目を確認し、完全性を高めます。スコアは入力の充足度に応じて自動更新されます。',
    links: [
      { to: '/customers', label: '顧客一覧から確認' },
      { to: '/products', label: '製品一覧から確認' },
    ],
  },
  {
    title: '⑤ 重複を統合する',
    detail:
      '重複候補パネルで同一実体と思われるペアを確認し、正しいゴールデンレコードへ統合・整理します。',
    links: [{ to: '/', label: 'ダッシュボードで重複候補を見る' }],
  },
  {
    title: '⑥ ライフサイクルを管理する',
    detail:
      '運用状況に合わせてステータス（下書き→有効→無効→アーカイブ）と担当スチュワードを更新します。',
    links: [
      { to: '/customers', label: '顧客マスタへ' },
      { to: '/products', label: '製品マスタへ' },
    ],
  },
];

interface QuickLink {
  to: string;
  label: string;
  description: string;
}

const QUICK_LINKS: QuickLink[] = [
  { to: '/', label: 'ダッシュボード', description: '品質・重複・件数の全体像' },
  {
    to: '/customers',
    label: '顧客マスタ一覧',
    description: '顧客レコードの検索・確認',
  },
  {
    to: '/products',
    label: '製品マスタ一覧',
    description: '製品レコードの検索・確認',
  },
  {
    to: '/customers/new',
    label: '顧客を新規登録',
    description: '新しい顧客を追加',
  },
  {
    to: '/products/new',
    label: '製品を新規登録',
    description: '新しい製品を追加',
  },
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
 * Static explanatory guide (presentational only). Introduces MDM concepts and
 * documents how to operate this PoC. Holds no state and calls no ports.
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
          </p>
        </div>
      </Section>

      <Section title="なぜMDMが必要か" description="典型的な課題">
        <ul className="space-y-2">
          {WHY_MDM.map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600"
            >
              <span className="mt-0.5 text-rose-500">●</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
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

      <Section title="このアプリでできること" description="PoCが提供するMDM機能">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((c) => (
            <div
              key={c.title}
              className="flex flex-col rounded-lg border border-slate-200 bg-white p-4"
            >
              <span className="w-fit rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
                {c.tab}
              </span>
              <h3 className="mt-3 text-sm font-semibold text-slate-900">
                {c.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                {c.description}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="使い方ガイド" description="基本的な運用フロー">
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
