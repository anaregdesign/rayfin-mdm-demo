// MDM PoC demo-data seeder.
//
// Seeds representative 顧客マスタ (customers) and 製品マスタ (products) — including
// intentional duplicate pairs and a status/quality spread — directly into the
// Fabric SQL Database that backs the deployed app, so the dashboard, duplicate
// detection, and quality-scoring features have meaningful data to show.
//
// Why direct SQL (not the GraphQL data plane): the Rayfin data plane requires a
// brokered, workload-scoped Fabric token that is only obtainable from the portal
// iframe flow, so it cannot be driven headlessly. The SQL Database accepts a
// standard AAD access token (`https://database.windows.net/`) for its owner,
// which `az` can mint, so seeding writes to the same store the app reads.
//
// Prerequisites:
//   - `az login` as a user who owns the Fabric SQL Database (the app's deployer).
//   - Dev dependency `mssql` installed (it is a devDependency of this project).
//   - The app has been deployed at least once (`rayfin up`) so the SQL Database
//     and its tables exist. `rayfin/.deployments.json` must contain the active
//     deployment's workspace id.
//
// Usage:
//   npm run seed
//   # or override auto-resolution:
//   SEED_SQL_SERVER=... SEED_SQL_DATABASE=... SQL_TOKEN=... node scripts/seed.mjs
//
// The script is idempotent: it DELETEs existing Customers/Products rows first.

import sql from 'mssql';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const FABRIC_RESOURCE = 'https://api.fabric.microsoft.com';
const SQL_RESOURCE = 'https://database.windows.net/';

function azToken(resource) {
  try {
    return execFileSync(
      'az',
      ['account', 'get-access-token', '--resource', resource, '--query', 'accessToken', '-o', 'tsv'],
      { encoding: 'utf8' },
    ).trim();
  } catch (err) {
    console.error(
      `\n❌ Failed to obtain an access token for ${resource} via the Azure CLI.\n` +
        '   Run `az login` (as the app deployer / SQL DB owner) and retry.\n',
    );
    throw err;
  }
}

function readActiveWorkspaceId() {
  if (process.env.SEED_WORKSPACE_ID) return process.env.SEED_WORKSPACE_ID;
  const raw = readFileSync(resolve(projectRoot, 'rayfin/.deployments.json'), 'utf8');
  const { deployments, active } = JSON.parse(raw);
  const dep = deployments?.[active];
  if (!dep?.fabricWorkspaceId) {
    throw new Error('Could not resolve fabricWorkspaceId from rayfin/.deployments.json');
  }
  return dep.fabricWorkspaceId;
}

function readAppName() {
  const raw = readFileSync(resolve(projectRoot, 'package.json'), 'utf8');
  return JSON.parse(raw).name;
}

async function fabricGet(path, token) {
  const res = await fetch(`${FABRIC_RESOURCE}/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Fabric API GET ${path} → ${res.status} ${res.statusText}: ${await res.text()}`);
  }
  return res.json();
}

async function resolveSqlTarget() {
  // Allow full manual override (e.g. offline / non-az environments).
  if (process.env.SEED_SQL_SERVER && process.env.SEED_SQL_DATABASE) {
    return { server: process.env.SEED_SQL_SERVER, database: process.env.SEED_SQL_DATABASE };
  }

  const workspaceId = readActiveWorkspaceId();
  const appName = readAppName();
  const fabricToken = azToken(FABRIC_RESOURCE);

  const list = await fabricGet(`/workspaces/${workspaceId}/sqlDatabases`, fabricToken);
  const match =
    (list.value ?? []).find((d) => d.displayName === appName) ?? (list.value ?? [])[0];
  if (!match) {
    throw new Error(`No SQL Database found in workspace ${workspaceId}. Has the app been deployed?`);
  }

  const item = await fabricGet(`/workspaces/${workspaceId}/sqlDatabases/${match.id}`, fabricToken);
  const props = item.properties ?? item;
  const server = props.serverFqdn ?? props.serverFQDN ?? props.server;
  const database = props.databaseName ?? props.database;
  if (!server || !database) {
    throw new Error(`SQL Database item did not expose serverFqdn/databaseName: ${JSON.stringify(props)}`);
  }
  return { server, database };
}

// ---------------------------------------------------------------------------
// Customers (顧客マスタ) — status + quality spread, 2 intentional dup pairs.
// ---------------------------------------------------------------------------
const customers = [
  // dup pair A — same email (info@globaltech.co.jp) → "メールアドレスが一致" (95)
  {
    code: 'GT-001', name: 'グローバルテック株式会社', nameKana: 'グローバルテック',
    customerType: 'corporate', industry: '情報通信', email: 'info@globaltech.co.jp',
    phone: '03-1234-5678', postalCode: '100-0005', prefecture: '東京都', city: '千代田区',
    addressLine: '丸の内1-1-1', country: 'Japan', website: 'https://globaltech.co.jp',
    taxId: 'T1234567890123', annualRevenue: 5200000000, status: 'active', steward: '佐藤花子',
    notes: '主要取引先。四半期ごとにレビュー。',
  },
  {
    code: 'GT-9001', name: 'グローバルテック㈱', nameKana: 'グローバルテック',
    customerType: 'corporate', industry: '情報通信', email: 'info@globaltech.co.jp',
    country: 'Japan', status: 'draft',
    notes: '別部門から登録された可能性あり（重複確認要）。',
  },
  // dup pair B — name similarity via kanji variant 会/會 (~91%) → "名称が類似"
  {
    code: 'YE-100', name: 'ヤマト電子工業株式会社', nameKana: 'ヤマトデンシコウギョウ',
    customerType: 'corporate', industry: '製造', email: 'contact@yamato-denshi.co.jp',
    phone: '052-222-3333', postalCode: '460-0008', prefecture: '愛知県', city: '名古屋市中区',
    addressLine: '栄3-2-1', country: 'Japan', website: 'https://yamato-denshi.co.jp',
    taxId: 'T2233445566778', annualRevenue: 1800000000, status: 'active', steward: '鈴木一郎',
    notes: '電子部品サプライヤー。',
  },
  {
    code: 'YE-205', name: 'ヤマト電子工業株式會社', nameKana: 'ヤマトデンシコウギョウ',
    customerType: 'corporate', industry: '製造', phone: '052-222-3333',
    prefecture: '愛知県', country: 'Japan', status: 'inactive',
    notes: '旧字体で登録された重複候補。',
  },
  // High quality, active
  {
    code: 'SK-300', name: 'さくら物流株式会社', nameKana: 'サクラブツリュウ',
    customerType: 'corporate', industry: '運輸', email: 'sales@sakura-logi.co.jp',
    phone: '06-6543-2100', postalCode: '530-0001', prefecture: '大阪府', city: '大阪市北区',
    addressLine: '梅田2-4-9', country: 'Japan', website: 'https://sakura-logi.co.jp',
    taxId: 'T9988776655443', annualRevenue: 950000000, status: 'active', steward: '高橋健',
    notes: '全国配送網。',
  },
  // Low quality — minimal individual
  {
    code: 'IND-501', name: '田中太郎', customerType: 'individual',
    country: 'Japan', status: 'draft',
  },
  // Medium — active but missing steward + invalid email → 2 governance/quality issues
  {
    code: 'OF-700', name: '株式会社オーシャンフーズ', nameKana: 'オーシャンフーズ',
    customerType: 'corporate', industry: '食品卸', email: 'oceanfoods.co.jp',
    phone: '092-111-2222', prefecture: '福岡県', city: '福岡市博多区',
    country: 'Japan', status: 'active',
    notes: 'メール形式・データ管理者未設定の要改善レコード。',
  },
  // Medium/high consulting
  {
    code: 'MC-810', name: 'みらいコンサルティング合同会社', nameKana: 'ミライコンサルティング',
    customerType: 'corporate', industry: 'コンサルティング', email: 'hello@mirai-consulting.jp',
    phone: '03-9876-5432', postalCode: '150-0002', prefecture: '東京都', city: '渋谷区',
    addressLine: '渋谷4-5-6', country: 'Japan', status: 'active', steward: '田中みなみ',
  },
  // Archived
  {
    code: 'BS-900', name: 'ブルースカイ商事株式会社', nameKana: 'ブルースカイショウジ',
    customerType: 'corporate', industry: '卸売', email: 'info@bluesky-trading.co.jp',
    prefecture: '北海道', city: '札幌市中央区', country: 'Japan', status: 'archived',
    notes: '取引終了によりアーカイブ。',
  },
  // Individual with some contact
  {
    code: 'IND-502', name: '山田花子', nameKana: 'ヤマダハナコ', customerType: 'individual',
    email: 'yamada.hanako@example.jp', phone: '090-1111-2222',
    prefecture: '神奈川県', city: '横浜市西区', country: 'Japan', status: 'active', steward: '高橋健',
  },
  // High quality
  {
    code: 'NS-950', name: 'ネクストステージ株式会社', nameKana: 'ネクストステージ',
    customerType: 'corporate', industry: '広告', email: 'contact@nextstage.co.jp',
    phone: '03-2468-1357', postalCode: '105-0011', prefecture: '東京都', city: '港区',
    addressLine: '芝公園1-2-3', country: 'Japan', website: 'https://nextstage.co.jp',
    taxId: 'T5556667778889', annualRevenue: 320000000, status: 'active', steward: '佐藤花子',
  },
  // Medium, inactive
  {
    code: 'GE-960', name: 'グリーンエナジー株式会社', nameKana: 'グリーンエナジー',
    customerType: 'corporate', industry: 'エネルギー', email: 'info@green-energy.co.jp',
    prefecture: '宮城県', city: '仙台市青葉区', country: 'Japan', status: 'inactive',
    notes: '契約更新保留中。',
  },
];

// ---------------------------------------------------------------------------
// Products (製品マスタ) — category/UoM/status/quality spread, 1 dup pair.
// ---------------------------------------------------------------------------
const products = [
  // dup pair C — same barcode + near-identical name (space) → barcode(98)+name(100)
  {
    sku: 'EL-WM-100', name: 'ワイヤレスマウス WM-100', nameKana: 'ワイヤレスマウス',
    category: 'electronics', brand: 'ロジコム', description: '静音設計の2.4GHzワイヤレスマウス。',
    unitPrice: 2980, currency: 'JPY', unitOfMeasure: 'piece', barcode: '4901234500017',
    supplierName: 'ロジコム株式会社', status: 'active', steward: '山本三郎',
  },
  {
    sku: 'EL-WM-100B', name: 'ワイヤレスマウスWM-100', category: 'electronics',
    unitPrice: 2980, currency: 'JPY', unitOfMeasure: 'piece', barcode: '4901234500017',
    status: 'draft', notes: '別SKUで再登録された重複候補。',
  },
  // High quality
  {
    sku: 'EL-CBL-C1', name: 'USB-C 充電ケーブル 1m', nameKana: 'ユーエスビーシーケーブル',
    category: 'electronics', brand: 'コネクト', description: 'PD対応USB-C to Cケーブル、1メートル。',
    unitPrice: 1280, currency: 'JPY', unitOfMeasure: 'piece', barcode: '4901234500123',
    supplierName: 'コネクト工業', status: 'active', steward: '山本三郎',
  },
  {
    sku: 'BV-TEA-500', name: 'オーガニック緑茶 500ml', nameKana: 'オーガニックリョクチャ',
    category: 'beverage', brand: 'しずく', description: '国産茶葉100%の無糖緑茶。',
    unitPrice: 150, currency: 'JPY', unitOfMeasure: 'piece', barcode: '4901234512345',
    supplierName: 'しずく飲料', status: 'active', steward: '中村さゆり',
  },
  // Medium — active, no steward
  {
    sku: 'FD-COF-1K', name: 'プレミアムコーヒー豆 1kg', category: 'food', brand: 'ロースト工房',
    unitPrice: 3200, currency: 'JPY', unitOfMeasure: 'kg', supplierName: 'ロースト工房',
    status: 'active', notes: 'データ管理者未設定の要改善レコード。',
  },
  // Low — minimal service
  {
    sku: 'SV-MTG-01', name: '会議室予約サービス', category: 'service',
    unitPrice: 5000, currency: 'JPY', unitOfMeasure: 'hour', status: 'draft',
  },
  {
    sku: 'FN-DSK-01', name: 'スチールデスク W1200', nameKana: 'スチールデスク',
    category: 'furniture', brand: 'オフィスワン', description: '耐荷重80kgの平机。',
    unitPrice: 18800, currency: 'JPY', unitOfMeasure: 'piece', supplierName: 'オフィスワン家具',
    status: 'active', steward: '加藤大輔',
  },
  // Medium — stationery
  {
    sku: 'ST-NB-A4', name: 'A4ノート 5冊パック', category: 'stationery', brand: 'ノートワークス',
    unitPrice: 680, currency: 'JPY', unitOfMeasure: 'set', status: 'active',
    notes: 'ブランド以外の属性が未整備。',
  },
  // High but discontinued
  {
    sku: 'EL-KB-200', name: 'ワイヤレスキーボード KB-200', nameKana: 'ワイヤレスキーボード',
    category: 'electronics', brand: 'ロジコム', description: 'テンキー付きワイヤレスキーボード。',
    unitPrice: 4980, currency: 'JPY', unitOfMeasure: 'piece', barcode: '4901234500789',
    supplierName: 'ロジコム株式会社', status: 'discontinued', steward: '山本三郎',
    notes: '後継モデルへ移行のため販売終了。',
  },
  {
    sku: 'BV-WTR-2L', name: 'ミネラルウォーター 2L', category: 'beverage', brand: 'クリア',
    unitPrice: 120, currency: 'JPY', unitOfMeasure: 'liter', status: 'active',
    notes: '仕入先・説明が未登録。',
  },
  // Low/medium apparel
  {
    sku: 'AP-TS-01', name: 'コットンTシャツ ホワイト', category: 'apparel',
    unitPrice: 1500, currency: 'JPY', unitOfMeasure: 'piece', status: 'draft',
  },
  // High furniture
  {
    sku: 'FN-CHR-99', name: '高機能デスクチェア', nameKana: 'コウキノウデスクチェア',
    category: 'furniture', brand: 'オフィスワン', description: 'ランバーサポート付きメッシュチェア。',
    unitPrice: 32000, currency: 'JPY', unitOfMeasure: 'piece', barcode: '4901234599999',
    supplierName: 'オフィスワン家具', status: 'active', steward: '加藤大輔',
  },
];

const SEED_USER = 'seed@mdm.demo';

// Recent, descending timestamps so the dashboard "最近の更新" list is meaningful.
const base = Date.now();
let tick = 0;
const ts = () => new Date(base - tick++ * 3 * 3600 * 1000); // 3h apart

function buildInsert(table, row) {
  const cols = Object.keys(row);
  const colList = cols.map((c) => `[${c}]`).join(', ');
  const paramList = cols.map((c) => `@${c}`).join(', ');
  return { text: `INSERT INTO [dbo].[${table}] (${colList}) VALUES (${paramList})`, cols };
}

async function insertRow(pool, table, row) {
  const withAudit = {
    id: randomUUID(),
    ...row,
    createdAt: ts(),
    updatedAt: ts(),
    createdBy: SEED_USER,
    updatedBy: SEED_USER,
  };
  const { text, cols } = buildInsert(table, withAudit);
  const req = pool.request();
  for (const c of cols) {
    const v = withAudit[c];
    if (c === 'createdAt' || c === 'updatedAt') req.input(c, sql.DateTime2, v);
    else if (c === 'id') req.input(c, sql.UniqueIdentifier, v);
    else if (typeof v === 'number') req.input(c, sql.Decimal(18, 0), v);
    else req.input(c, sql.NVarChar, v);
  }
  await req.query(text);
}

async function main() {
  const resolved = await resolveSqlTarget();
  const token = process.env.SQL_TOKEN ?? azToken(SQL_RESOURCE);

  // The Fabric API returns serverFqdn with a ",1433" port suffix — split it off
  // so it doesn't collide with the explicit `port` option.
  const [server, portStr] = String(resolved.server).split(',');
  const port = portStr ? Number(portStr) : 1433;
  const database = resolved.database;

  console.log(`Target: ${server}:${port} / ${database}`);
  const pool = await sql.connect({
    server,
    port,
    database,
    authentication: { type: 'azure-active-directory-access-token', options: { token } },
    options: { encrypt: true, trustServerCertificate: false },
  });

  console.log('Connected. Clearing existing MDM rows…');
  await pool.request().query('DELETE FROM [dbo].[Customers]');
  await pool.request().query('DELETE FROM [dbo].[Products]');

  console.log(`Seeding ${customers.length} customers…`);
  for (const c of customers) await insertRow(pool, 'Customers', c);
  console.log(`Seeding ${products.length} products…`);
  for (const p of products) await insertRow(pool, 'Products', p);

  const cc = await pool.request().query('SELECT COUNT(*) n FROM [dbo].[Customers]');
  const pc = await pool.request().query('SELECT COUNT(*) n FROM [dbo].[Products]');
  console.log(`✅ Done. Customers=${cc.recordset[0].n}, Products=${pc.recordset[0].n}`);
  await pool.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
