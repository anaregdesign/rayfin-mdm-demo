import type { Category } from '@/domain/models/category';
import type { Customer, CustomerInput } from '@/domain/models/customer';
import type { Product, ProductInput } from '@/domain/models/product';

/**
 * Demo-mode seed data. Ported from `scripts/seed.mjs` (the SQL seeder used
 * against the live Fabric DB) into typed domain models so the in-memory
 * repositories can serve the same representative 顧客/製品 master — including the
 * intentional duplicate pairs and a status/quality spread — with NO backend.
 *
 * `buildDemoSeed(now)` is a pure factory: it stamps descending audit timestamps
 * relative to `now` (3h apart) so the dashboard「最近の更新」list is meaningful on
 * every load, and assigns stable, readable ids (`cust-<code>` / `prod-<sku>` /
 * `cat-<code>`) so cross-references (merge winner ids, category links) resolve.
 */

/** Fixed author recorded on every seeded record's audit fields. */
export const SEED_USER = 'seed@mdm.demo';

/** 顧客マスタ — status + quality spread, 2 intentional duplicate pairs. */
const CUSTOMER_SEED: CustomerInput[] = [
  // dup pair A — same email (info@globaltech.co.jp) → "メールアドレスが一致"
  {
    code: 'GT-001',
    name: 'グローバルテック株式会社',
    nameKana: 'グローバルテック',
    customerType: 'corporate',
    industry: '情報通信',
    email: 'info@globaltech.co.jp',
    phone: '03-1234-5678',
    postalCode: '100-0005',
    prefecture: '東京都',
    city: '千代田区',
    addressLine: '丸の内1-1-1',
    country: 'Japan',
    website: 'https://globaltech.co.jp',
    taxId: 'T1234567890123',
    annualRevenue: 5200000000,
    status: 'active',
    steward: '佐藤花子',
    notes: '主要取引先。四半期ごとにレビュー。',
  },
  {
    code: 'GT-9001',
    name: 'グローバルテック㈱',
    nameKana: 'グローバルテック',
    customerType: 'corporate',
    industry: '情報通信',
    email: 'info@globaltech.co.jp',
    country: 'Japan',
    status: 'draft',
    notes: '別部門から登録された可能性あり（重複確認要）。',
  },
  // dup pair B — name similarity via kanji variant 会/會 → "名称が類似"
  {
    code: 'YE-100',
    name: 'ヤマト電子工業株式会社',
    nameKana: 'ヤマトデンシコウギョウ',
    customerType: 'corporate',
    industry: '製造',
    email: 'contact@yamato-denshi.co.jp',
    phone: '052-222-3333',
    postalCode: '460-0008',
    prefecture: '愛知県',
    city: '名古屋市中区',
    addressLine: '栄3-2-1',
    country: 'Japan',
    website: 'https://yamato-denshi.co.jp',
    taxId: 'T2233445566778',
    annualRevenue: 1800000000,
    status: 'active',
    steward: '鈴木一郎',
    notes: '電子部品サプライヤー。',
  },
  {
    code: 'YE-205',
    name: 'ヤマト電子工業株式會社',
    nameKana: 'ヤマトデンシコウギョウ',
    customerType: 'corporate',
    industry: '製造',
    phone: '052-222-3333',
    prefecture: '愛知県',
    country: 'Japan',
    status: 'inactive',
    notes: '旧字体で登録された重複候補。',
  },
  // High quality, active
  {
    code: 'SK-300',
    name: 'さくら物流株式会社',
    nameKana: 'サクラブツリュウ',
    customerType: 'corporate',
    industry: '運輸',
    email: 'sales@sakura-logi.co.jp',
    phone: '06-6543-2100',
    postalCode: '530-0001',
    prefecture: '大阪府',
    city: '大阪市北区',
    addressLine: '梅田2-4-9',
    country: 'Japan',
    website: 'https://sakura-logi.co.jp',
    taxId: 'T9988776655443',
    annualRevenue: 950000000,
    status: 'active',
    steward: '高橋健',
    notes: '全国配送網。',
  },
  // Low quality — minimal individual
  {
    code: 'IND-501',
    name: '田中太郎',
    customerType: 'individual',
    country: 'Japan',
    status: 'draft',
  },
  // Medium — active but missing steward + invalid email
  {
    code: 'OF-700',
    name: '株式会社オーシャンフーズ',
    nameKana: 'オーシャンフーズ',
    customerType: 'corporate',
    industry: '食品卸',
    email: 'oceanfoods.co.jp',
    phone: '092-111-2222',
    prefecture: '福岡県',
    city: '福岡市博多区',
    country: 'Japan',
    status: 'active',
    notes: 'メール形式・データ管理者未設定の要改善レコード。',
  },
  // Medium/high consulting
  {
    code: 'MC-810',
    name: 'みらいコンサルティング合同会社',
    nameKana: 'ミライコンサルティング',
    customerType: 'corporate',
    industry: 'コンサルティング',
    email: 'hello@mirai-consulting.jp',
    phone: '03-9876-5432',
    postalCode: '150-0002',
    prefecture: '東京都',
    city: '渋谷区',
    addressLine: '渋谷4-5-6',
    country: 'Japan',
    status: 'active',
    steward: '田中みなみ',
  },
  // Archived
  {
    code: 'BS-900',
    name: 'ブルースカイ商事株式会社',
    nameKana: 'ブルースカイショウジ',
    customerType: 'corporate',
    industry: '卸売',
    email: 'info@bluesky-trading.co.jp',
    prefecture: '北海道',
    city: '札幌市中央区',
    country: 'Japan',
    status: 'archived',
    notes: '取引終了によりアーカイブ。',
  },
  // Individual with some contact
  {
    code: 'IND-502',
    name: '山田花子',
    nameKana: 'ヤマダハナコ',
    customerType: 'individual',
    email: 'yamada.hanako@example.jp',
    phone: '090-1111-2222',
    prefecture: '神奈川県',
    city: '横浜市西区',
    country: 'Japan',
    status: 'active',
    steward: '高橋健',
  },
  // High quality
  {
    code: 'NS-950',
    name: 'ネクストステージ株式会社',
    nameKana: 'ネクストステージ',
    customerType: 'corporate',
    industry: '広告',
    email: 'contact@nextstage.co.jp',
    phone: '03-2468-1357',
    postalCode: '105-0011',
    prefecture: '東京都',
    city: '港区',
    addressLine: '芝公園1-2-3',
    country: 'Japan',
    website: 'https://nextstage.co.jp',
    taxId: 'T5556667778889',
    annualRevenue: 320000000,
    status: 'active',
    steward: '佐藤花子',
  },
  // Medium, inactive
  {
    code: 'GE-960',
    name: 'グリーンエナジー株式会社',
    nameKana: 'グリーンエナジー',
    customerType: 'corporate',
    industry: 'エネルギー',
    email: 'info@green-energy.co.jp',
    prefecture: '宮城県',
    city: '仙台市青葉区',
    country: 'Japan',
    status: 'inactive',
    notes: '契約更新保留中。',
  },
];

/** 製品マスタ — category/UoM/status/quality spread, 1 duplicate pair. */
const PRODUCT_SEED: ProductInput[] = [
  // dup pair C — same barcode + near-identical name (space) → barcode+name match
  {
    sku: 'EL-WM-100',
    name: 'ワイヤレスマウス WM-100',
    nameKana: 'ワイヤレスマウス',
    category: 'electronics',
    brand: 'ロジコム',
    description: '静音設計の2.4GHzワイヤレスマウス。',
    unitPrice: 2980,
    currency: 'JPY',
    unitOfMeasure: 'piece',
    barcode: '4901234500017',
    supplierName: 'ロジコム株式会社',
    status: 'active',
    steward: '山本三郎',
  },
  {
    sku: 'EL-WM-100B',
    name: 'ワイヤレスマウスWM-100',
    category: 'electronics',
    unitPrice: 2980,
    currency: 'JPY',
    unitOfMeasure: 'piece',
    barcode: '4901234500017',
    status: 'draft',
    notes: '別SKUで再登録された重複候補。',
  },
  // High quality
  {
    sku: 'EL-CBL-C1',
    name: 'USB-C 充電ケーブル 1m',
    nameKana: 'ユーエスビーシーケーブル',
    category: 'electronics',
    brand: 'コネクト',
    description: 'PD対応USB-C to Cケーブル、1メートル。',
    unitPrice: 1280,
    currency: 'JPY',
    unitOfMeasure: 'piece',
    barcode: '4901234500123',
    supplierName: 'コネクト工業',
    status: 'active',
    steward: '山本三郎',
  },
  {
    sku: 'BV-TEA-500',
    name: 'オーガニック緑茶 500ml',
    nameKana: 'オーガニックリョクチャ',
    category: 'beverage',
    brand: 'しずく',
    description: '国産茶葉100%の無糖緑茶。',
    unitPrice: 150,
    currency: 'JPY',
    unitOfMeasure: 'piece',
    barcode: '4901234512345',
    supplierName: 'しずく飲料',
    status: 'active',
    steward: '中村さゆり',
  },
  // Medium — active, no steward
  {
    sku: 'FD-COF-1K',
    name: 'プレミアムコーヒー豆 1kg',
    category: 'food',
    brand: 'ロースト工房',
    unitPrice: 3200,
    currency: 'JPY',
    unitOfMeasure: 'kg',
    supplierName: 'ロースト工房',
    status: 'active',
    notes: 'データ管理者未設定の要改善レコード。',
  },
  // Low — minimal service
  {
    sku: 'SV-MTG-01',
    name: '会議室予約サービス',
    category: 'service',
    unitPrice: 5000,
    currency: 'JPY',
    unitOfMeasure: 'hour',
    status: 'draft',
  },
  {
    sku: 'FN-DSK-01',
    name: 'スチールデスク W1200',
    nameKana: 'スチールデスク',
    category: 'furniture',
    brand: 'オフィスワン',
    description: '耐荷重80kgの平机。',
    unitPrice: 18800,
    currency: 'JPY',
    unitOfMeasure: 'piece',
    supplierName: 'オフィスワン家具',
    status: 'active',
    steward: '加藤大輔',
  },
  // Medium — stationery
  {
    sku: 'ST-NB-A4',
    name: 'A4ノート 5冊パック',
    category: 'stationery',
    brand: 'ノートワークス',
    unitPrice: 680,
    currency: 'JPY',
    unitOfMeasure: 'set',
    status: 'active',
    notes: 'ブランド以外の属性が未整備。',
  },
  // High but discontinued
  {
    sku: 'EL-KB-200',
    name: 'ワイヤレスキーボード KB-200',
    nameKana: 'ワイヤレスキーボード',
    category: 'electronics',
    brand: 'ロジコム',
    description: 'テンキー付きワイヤレスキーボード。',
    unitPrice: 4980,
    currency: 'JPY',
    unitOfMeasure: 'piece',
    barcode: '4901234500789',
    supplierName: 'ロジコム株式会社',
    status: 'discontinued',
    steward: '山本三郎',
    notes: '後継モデルへ移行のため販売終了。',
  },
  {
    sku: 'BV-WTR-2L',
    name: 'ミネラルウォーター 2L',
    category: 'beverage',
    brand: 'クリア',
    unitPrice: 120,
    currency: 'JPY',
    unitOfMeasure: 'liter',
    status: 'active',
    notes: '仕入先・説明が未登録。',
  },
  // Low/medium apparel
  {
    sku: 'AP-TS-01',
    name: 'コットンTシャツ ホワイト',
    category: 'apparel',
    unitPrice: 1500,
    currency: 'JPY',
    unitOfMeasure: 'piece',
    status: 'draft',
  },
  // High furniture
  {
    sku: 'FN-CHR-99',
    name: '高機能デスクチェア',
    nameKana: 'コウキノウデスクチェア',
    category: 'furniture',
    brand: 'オフィスワン',
    description: 'ランバーサポート付きメッシュチェア。',
    unitPrice: 32000,
    currency: 'JPY',
    unitOfMeasure: 'piece',
    barcode: '4901234599999',
    supplierName: 'オフィスワン家具',
    status: 'active',
    steward: '加藤大輔',
  },
];

/** Product category master — a small tree (電子機器 has two children). */
const CATEGORY_SEED: Array<{
  code: string;
  name: string;
  parentCode?: string;
  description?: string;
}> = [
  { code: 'EL', name: '電子機器', description: '電子機器・周辺機器' },
  { code: 'EL-PER', name: '周辺機器', parentCode: 'EL' },
  { code: 'EL-CBL', name: 'ケーブル・アクセサリ', parentCode: 'EL' },
  { code: 'BV', name: '飲料' },
  { code: 'FD', name: '食品' },
  { code: 'FN', name: '家具' },
  { code: 'ST', name: '文具' },
  { code: 'SV', name: 'サービス' },
  { code: 'AP', name: 'アパレル' },
];

/** SKU → category-master code, so a few products show a category breadcrumb. */
const PRODUCT_CATEGORY_LINKS: Record<string, string> = {
  'EL-WM-100': 'EL-PER',
  'EL-WM-100B': 'EL-PER',
  'EL-CBL-C1': 'EL-CBL',
  'EL-KB-200': 'EL-PER',
  'BV-TEA-500': 'BV',
  'BV-WTR-2L': 'BV',
  'FD-COF-1K': 'FD',
  'FN-DSK-01': 'FN',
  'FN-CHR-99': 'FN',
  'ST-NB-A4': 'ST',
  'SV-MTG-01': 'SV',
  'AP-TS-01': 'AP',
};

const customerId = (code: string): string => `cust-${code}`;
const productId = (sku: string): string => `prod-${sku}`;
const categoryId = (code: string): string => `cat-${code}`;

const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

/** A monotonically descending clock so「最近の更新」ordering is meaningful. */
function descendingTicker(now: Date): () => Date {
  const base = now.getTime();
  let tick = 0;
  return () => new Date(base - tick++ * THREE_HOURS_MS);
}

export interface DemoSeed {
  customers: Customer[];
  products: Product[];
  categories: Category[];
}

/**
 * Build a fresh set of seeded domain records. Pure — every visitor gets an
 * identical sandbox stamped relative to the supplied `now` (defaults to the
 * current time).
 */
export function buildDemoSeed(now: Date = new Date()): DemoSeed {
  const nextTs = descendingTicker(now);

  const customers: Customer[] = CUSTOMER_SEED.map((input) => {
    const ts = nextTs();
    return {
      ...input,
      id: customerId(input.code),
      createdAt: ts,
      updatedAt: ts,
      createdBy: SEED_USER,
      updatedBy: SEED_USER,
    };
  });

  const products: Product[] = PRODUCT_SEED.map((input) => {
    const ts = nextTs();
    const linkCode = PRODUCT_CATEGORY_LINKS[input.sku];
    return {
      ...input,
      id: productId(input.sku),
      categoryId: linkCode ? categoryId(linkCode) : undefined,
      createdAt: ts,
      updatedAt: ts,
      createdBy: SEED_USER,
      updatedBy: SEED_USER,
    };
  });

  const categories: Category[] = CATEGORY_SEED.map((node) => {
    const ts = nextTs();
    return {
      id: categoryId(node.code),
      code: node.code,
      name: node.name,
      parentId: node.parentCode ? categoryId(node.parentCode) : undefined,
      description: node.description,
      createdAt: ts,
      updatedAt: ts,
      createdBy: SEED_USER,
      updatedBy: SEED_USER,
    };
  });

  return { customers, products, categories };
}
