# AGENTS.md

This project ships Rayfin agent context.
Load `.agents/skills/rayfin/SKILL.md` and the `rayfin` MCP server in `.mcp.json` before writing Rayfin code.

## Mandatory: Clean Architecture for all app code

All app-code development in this project **must** follow the
`rayfin-clean-architecture` skill. Before writing or refactoring anything under
`src/`, load `.agents/skills/rayfin-clean-architecture/SKILL.md` and treat its
"Top Priority Rules" as non-negotiable:

1. Obey the canonical `src/` layout with dependencies pointing strictly inward
   (`pages`/`components` → `usecase` → `domain`; `infrastructure` implements
   `domain` ports). `domain` never imports React, the Rayfin SDK, browser APIs,
   or `rayfin/data` decorator models.
2. Reach the Rayfin SDK only through infrastructure ports/adapters — never call
   `client.data.<Entity>`, `RayfinClient`, or an auth SDK from `pages`,
   `components`, `usecase`, or `domain`.
3. Assemble dependencies once in the composition root (`src/main.tsx`) and inject
   them — no service locators or module-level mutable singletons.
4. One component per file; declarative routing composed in `App.tsx`; thin route
   containers in `src/pages/` that delegate to use cases.
5. Never exceed a layer's responsibility, and defer platform concerns
   (data-model decorators, `@role`/RLS, CLI, deployment) to the `rayfin` skill.

**Division of ownership:** the `rayfin-clean-architecture` skill owns the app
codebase in `src/` (structure, layer boundaries, design patterns, UI, and
verification). The bundled `rayfin` skill (below) owns the platform surface —
data-model decorators, `@role`/row-level-security, auth methods, `rayfin.yml`,
the CLI (`rayfin up`, `rayfin login`), schema migration, and Fabric deployment.
When guidance conflicts, the clean-architecture Top Priority Rules win for
app code; defer platform questions to `rayfin`.

## Rayfin platform docs

Rayfin docs are version-locked to the packages installed in this project.
Prefer the MCP tools `search_docs`, `get_doc`, `list_docs`, and `discover_packages` for examples, API details, and troubleshooting.
If MCP is unavailable, run `rayfin docs ...` from the project root so the CLI reads this project's `node_modules`.
If `rayfin` is not on `PATH`, use `npx -y @microsoft/rayfin-cli docs ...` from the project root.

Use `discover_packages` or `rayfin docs discover <topic>` when installed docs do not cover the task.

## Project: Master Data Management (MDM) PoC

This project is a **Master Data Management proof-of-concept** built as a Rayfin
app on Microsoft Fabric. It manages two master domains — **製品マスタ (Product
Master)** and **顧客マスタ (Customer Master)** — and demonstrates the core MDM
capabilities:

- **Data model** — Customer & Product master entities (`rayfin/data/*` `@entity`).
- **Onboarding** — manual create/edit via validated UI forms.
- **Data quality** — per-record completeness/quality scoring with a 良好/要改善/不足 band.
- **Matching / dedup** — duplicate-candidate detection over normalized name/code/email/SKU.
- **Governance / lifecycle** — status lifecycle (draft→active→inactive/archived,
  product adds discontinued) + steward + audit fields, gated by status policies.
- **Search & 360° reference** — list with search/filter/sort and a full detail view.
- **Versioning / audit** — createdAt/updatedAt + createdBy/updatedBy.
- **Analytics** — dashboard with counts, status breakdown, quality distribution,
  and duplicate highlights.
- **In-app guide** — an **MDMガイド** tab (top of the sidebar) that explains why MDM
  matters (課題→価値), the core 用語, an **app overview mapping every sidebar tab** to
  its role, an 8-step quickstart (探す→登録→CSV取込→品質是正→名寄せ→承認→配信), a
  **ロールと承認フロー** section (viewer/steward/admin + the demo approval toggle), and
  the quality-score legend. Static & presentational (no state/ports); every step,
  feature card, and the「主要ページへのショートカット」grid deep-link straight to the
  relevant routes (`/`, `/customers[/new]`, `/products[/new]`, `/categories`,
  `/workqueue`, `/remediation`, `/distribution`, `/approvals`) so readers can jump
  into the app from the guide. **Keep the guide in sync whenever tabs/features
  change** — it is the single onboarding surface (`components/guide/GuideContent.tsx`).

**All UI text is Japanese.** Keep new labels, messages, and empty/error states in Japanese.

### Layer map (follow when extending)

- `rayfin/data/` — `@entity` classes + `schema.ts` (platform-owned persistence shape).
- `src/domain/` — plain models, `value-objects/`, `policies/` (quality, dedup,
  status, validation), repository/auth **ports**. No React, no SDK, no browser APIs.
- `src/infrastructure/` — Rayfin client facade, data repositories (map entity↔domain),
  auth adapters, and the `config/create-dependencies.ts` composition factory.
- `src/di/` — `AppDependencies` + `DependenciesProvider`/`useDependencies`.
- `src/usecase/` — one folder per feature (`customers`, `products`, `dashboard`,
  `auth`); `selectors.ts` (pure derivation) + `use-*-page.ts` view-model hooks.
  `auth/` follows the canonical split — `AuthContext.tsx` exports **only** the
  `AuthProvider` component (view-facing auth context, `AuthService` injected),
  while `use-auth.ts` owns the context object + `useAuth` hook. Keep the hook out
  of the `.tsx` so the provider file exports a component exclusively (satisfies
  `react-refresh/only-export-components`).
- `src/components/` — `shared/` primitives (+ `shared/tone.ts`, the single
  band/tone→Tailwind map) and render-only feature components (`dashboard/`,
  `guide/`, …).
- `src/pages/` — thin route containers; a data-driven page calls exactly **one**
  VM hook and wires it to components, while a static informational page (e.g.
  `GuidePage`) may call **no** hook and just render presentational components.
  Routing is composed in `src/App.tsx`; the composition root is `src/main.tsx`.

### Conventions established in this codebase

- **View-models over hooks in views.** Components are render-only and receive
  VM-derived values + handlers as explicit props; they never import usecase hooks
  or call the SDK. Pages own the hook and pass props down.
- **Business rules live in `domain`/`usecase`, never in components.** Views only
  ask domain predicates (e.g. `canEditCustomer`, `allowedProductTransitions`) and
  render the result.
- **Forms** take `onField(key, value)` (= `vm.setField`) and cast select strings
  to their unions; number fields normalize empty input in the component, and the
  domain validation flags the missing/invalid value.
- **Styling** for status/quality must go through `components/shared/tone.ts` —
  do not scatter Tailwind color logic across components.
- **Navigation.** For **static** links to known routes, use `Link`/`NavLink` from
  `react-router-dom` directly inside a presentational component — these are
  rendering primitives, not usecase/SDK calls (see `AppShell` nav and the
  `GuideContent` step/shortcut links). For **dynamic** navigation to a record id,
  the page owns `useNavigate` and passes an `onOpen`/`onNavigate` handler down as a
  prop (see `DashboardPage` → `RecentActivity`); components never call `useNavigate`.
- **Entity `@text` limits (MSSQL/DAB).** Every `@text` field must be **bounded to
  `max: 4000` or less** — 4000 is the MSSQL `NVARCHAR` sized-string limit. A single
  field with a larger `max` makes `rayfin up` / `rayfin up db apply` **reject the
  entire schema** (every pending table + column freezes — see "Deployed-schema
  drift" under Deployment). Do **not** drop `max` to get `NVARCHAR(MAX)` either —
  unbounded text breaks DAB GraphQL generation and can't be indexed. For larger
  JSON payloads keep `max: 4000` and truncate defensively in the mapper. The unit
  test `entity-text-limits.test.ts` enforces this across all entities, so the
  mistake fails locally/in CI instead of silently at deploy time.

To add a master field: update the `@entity` (+ `schema.ts`), the domain model +
`*ToInput`/`empty*Input` + validation/quality policy, the mapper in
`infrastructure/data/`, then surface it in the form/detail/table components. Run
`npm run build && npm run lint && npm run test` before deploying with `rayfin up`.

To add a screen/tab: create a render-only component under
`src/components/<feature>/`, a thin container `src/pages/<Feature>Page.tsx`
(one VM hook, or none for static content), register a declarative `<Route>` in
`src/App.tsx`, and add the `NAV_ITEMS` entry in
`src/components/layout/AppShell.tsx`. `AppShell` renders a **fixed left sidebar**
(logo → vertical `NAV_ITEMS` nav → footer with `controls` slot + user + サインアウト)
next to the scrolling `max-w-6xl` content area. Keep all labels/copy in Japanese.

### Testing conventions & coverage

- **Framework & layout.** Vitest (jsdom env, `globals: true`, `@/`→`src` alias,
  setup `src/__tests__/setup.ts`). Tests are **co-located** in a `__tests__/`
  dir next to the code under test and named `*.test.ts` (`.tsx` only when a React
  component/provider is exercised). Always `import { describe, expect, it } from
  'vitest';`.
- **What to test (priority order).** Pure, framework-free logic carries the
  regression net: **domain value-objects** (`value-objects/__tests__`),
  **domain policies** (`policies/__tests__`), **domain models' derived helpers**
  (e.g. `qualityBand`), **`src/lib/` utilities** (`text`, `format`, `csv`,
  `normalize`), and **infrastructure mappers** (`infrastructure/data/__tests__` —
  row↔domain round-trip + blank/null→undefined). Usecase selectors are unit-tested
  where they hold logic (`usecase/*/__tests__/selectors.test.ts`). Components/pages
  are render-only and are covered indirectly through the VM/policy tests, not with
  DOM snapshots.
- **Fixture style.** Build domain fixtures with small local `factory(overrides)`
  helpers (see `duplicate-policy.test.ts`); for infra rows/inputs cast the factory
  return with `as XxxRow` / `as XxxInput` and simulate null columns with
  `null as unknown as string` (mirrors `customer-mapper.test.ts`).
- **Determinism.** Inject `now`/thresholds into policies rather than reading the
  clock (steward/analytics already accept a context). For `format`/date tests build
  dates from **local components** (`new Date(2024, 0, 15, 9, 5)`) so assertions are
  timezone-stable; for `Intl` currency/number assert loosely (contains the grouped
  digits, not an exact glyph) to avoid ICU drift.
- **Boundaries first.** Pin the exact rule edges — quality bands (80/79/50/49),
  similarity threshold (≥ 0.82), validation length caps, status-transition maps,
  score arithmetic. These are the cheapest things to regress and the whole point of
  the suite.
- **Run before shipping.** `npx vitest run` must stay green (current baseline
  **425 tests / 37 files**) alongside `tsc -b`, `eslint .` (0 warnings),
  `vite build`, and the four arch-drift greps. CI (`ci.yml`) re-runs the same gate
  on every PR.

### Change history & audit (Issue #5)

Every customer/product mutation is recorded as an immutable `ChangeLog` entry and
surfaced as a rollback-capable timeline on the detail pages. The design keeps use
cases and views unaware of auditing:

- **Platform:** `rayfin/data/ChangeLog.ts` (`@authenticated('*')`) stores
  `entityType`/`entityId`/`action`/`changedFields` (JSON string, `@text max 8000`)
  `/actorId`/`summary`/`occurredAt`. Registered in `schema.ts` (additive — safe on
  `rayfin up`, no `--force`).
- **Pure diff engine:** `src/domain/policies/diff-policy.ts` — `diffRecords` emits a
  stable, ordered `FieldChange[]` (audit/identity fields in `IGNORED_DIFF_FIELDS`
  are skipped; `''`/`null`/`undefined` are treated as equal), and `revertChanges`
  applies the `before` side to undo an edit. Fully unit-tested
  (`domain/policies/__tests__/diff-policy.test.ts`).
- **Decorator-audit convention.** Auditing is layered with the **decorator
  pattern**, not baked into the base repos: `ChangeLoggingCustomerRepository` /
  `ChangeLoggingProductRepository` wrap the canonical Rayfin repos behind the same
  `CustomerRepository`/`ProductRepository` port, compute the diff, and append a
  `ChangeLog` row. Wiring lives in `create-dependencies.ts` (a shared `actor`
  closure resolves the current user's email/id). Audit writes are **non-fatal** —
  `safeAppend` swallows+logs errors so a logging failure never breaks the mutation
  (a pragmatic PoC integrity trade-off).
- **Rollback.** The detail VM's `restore(entry)` reverts via
  `revertChanges(*ToInput(current), entry.changes)` → `store.update*`. The restore
  itself is audited as a new `update` entry, and the timeline auto-refreshes
  because the resulting `updatedAt` change bumps the hook's `reloadKey`.
- **View surface:** `useChangeHistory(entityType, id, reloadKey)` →
  `HistoryTimeline`/`FieldDiffRow` (render-only). When adding a new auditable
  master, wrap its repo with a logging decorator in the composition root — do not
  add audit calls inside use cases or components.

### Merge & survivorship (Issue #4)

Two duplicate master records can be collapsed into one surviving **golden
record** from the 360° detail page, and every merge is a **reversible**
`MergeRecord`. The write path stays entirely inside the use-case layer; the
detail store, auditing, and status changes are all reused rather than
duplicated.

- **Platform:** `rayfin/data/MergeRecord.ts` (`@authenticated('*')`) stores the
  reversible snapshot — `entityType`/`winnerId`/`loserIds`
  (JSON `string[]`)/`fieldSources` (JSON field→`winner|loser`)/`winnerBefore`
  (JSON of the winner's pre-merge input)/`loserStatuses` (JSON loserId→prior
  status)/`performedBy`/`performedAt`/`undoneAt`. Registered in `schema.ts`
  (additive — safe on `rayfin up`). The loser lifecycle adds a system-only
  `merged` status (in the status union + `*_STATUS_META` badges, but **not** in
  `*_STATUS_VALUES` so forms/filters can't pick it; `merged` is terminal —
  only unmerge exits it, and merged records are not editable/deletable).
- **Pure survivorship policy:** `src/domain/policies/merge-policy.ts` —
  `isEmptyValue` (blank/null/undefined empty; **0 and false are NOT empty**),
  `mergeableFields` (union of keys minus `status`), `defaultFieldSources`
  (seeds each field from a `SurvivorshipStrategy` — `winner` / `newer`
  (via `winnerNewer`) / `nonEmpty` completeness-fill), `buildResolutions`,
  `applyResolutions` (composes the golden record, never mutates inputs), and
  `canMerge` (rejects self-merge/empty ids). Fully unit-tested
  (`domain/policies/__tests__/merge-policy.test.ts`).
- **Merge lives in the use case, delegated via gateways.**
  `src/usecase/merge/use-merge.ts` (`useMerge(entityType, gateways)`) is
  store-agnostic and orchestrates: apply resolutions → golden → `applyGolden`
  (audited winner update) → `markMerged` (loser) → append a `MergeRecord`
  snapshot → reload. `unmerge` replays the snapshot: restore the winner from
  `winnerBefore`, `restoreMerged` each loser to its prior status, `markUndone`.
  Each detail VM injects the gateways (`applyGolden`/`markMerged`/
  `restoreMerged`/`reload`/`onBusy`/`onError`) so **merge reuses the detail VM's
  own store instance** — critical because `useCustomers()`/`useProducts()` are
  plain (non-context) hooks, so spinning up a fresh store here would desync the
  screen. `performedBy` is stamped **by the repo** from the session, keeping the
  session out of the use case.
- **Pure view-plan:** `src/usecase/merge/merge-plan.ts` — `buildMergePlan`
  returns a `MergePlan` whose `computeDefaults(strategy)` is an **injected
  closure**, so `MergeDialog` re-seeds field sources on strategy change without
  importing any policy. The dialog imports only domain enums/labels
  (`SURVIVORSHIP_STRATEGY_VALUES`, `survivorshipStrategyLabel`) — no business
  logic in the view.
- **View surface:** `components/merge/MergeDialog.tsx` (side-by-side
  survivorship editor) + `components/merge/MergeHistoryPanel.tsx` (undo).
  `DuplicatePanel` gained optional `currentId` + `renderAction` props so each
  duplicate pair renders a「統合」button targeting the counterpart; the detail
  page holds the `mergeTargetId`/plan state and drives the dialog. The winner is
  always the record you opened (open merge from the record you want to keep).
- **Reversibility is best-effort (PoC).** The merge write sequence is
  non-atomic (golden → markMerged → append record); a mid-sequence failure is
  surfaced via `onError` but not rolled back automatically — the `MergeRecord`
  snapshot is what makes a later manual unmerge possible. Its infra mapper
  (`merge-record-mapper.ts`) parses every JSON column defensively (malformed →
  safe default) so the history panel never crashes; round-trip tested
  (`infrastructure/data/__tests__/merge-record-mapper.test.ts`).

### Bulk import/export (Issue #6)

Both master lists can round-trip through **CSV** — export the current filtered
view, or import a file with a per-row validated preview before committing. The
same clean-architecture rules apply: parsing/serialisation is a pure `lib`
concern, all business verdicts live in a domain policy, the write orchestration
(and the only DOM side effect) is in the use case, and the components are
render-only.

- **Pure CSV codec:** `src/lib/csv.ts` — dependency-free `parseCsv` (RFC-4180:
  quoted fields, `""` escapes, embedded commas/CR-LF, trailing-newline safe),
  `toCsv` (CRLF-joined, quotes cells with `",\r\n`), and `recordsFromMatrix`
  (zips the header row into `Record<string,string>[]`, trims headers/cells, pads
  ragged rows). No DOM, no SDK. Unit-tested (`src/lib/__tests__/csv.test.ts`).
- **One field spec drives BOTH directions.** `src/domain/policies/import-policy.ts`
  defines one ordered `FieldSpec[]` per entity; export maps `entity → cells`
  (`customerToCsvRow`/`productToCsvRow`, `CUSTOMER_CSV_HEADERS`/
  `PRODUCT_CSV_HEADERS`) and import maps `cells → draft input`, so the two
  directions are guaranteed to round-trip. A test asserts
  `HEADERS.length === toCsvRow(sample).length` to catch schema drift. Enum cells
  accept the canonical value **or** the Japanese label (`buildEnumParser`);
  numbers tolerate `, ￥¥$€` separators (`parseNumberCell`). The system-only
  `merged` status is intentionally **not importable** (excluded from
  `*_STATUS_VALUES` → parser rejects it).
- **Per-row verdict is pure.** `evaluateCustomerImport`/`evaluateProductImport`
  `(records, existing, mode) → ImportPreview` reuses the existing
  `validate*Input` and `find*MatchesForInput` policies to label each row
  `ok | warning | error` with an action `insert | update | skip | error`:
  within-file key dup → error; existing-key match honours the **mode**
  (`insert` → error, `skip` → skip, `upsert` → update); a new row that resembles
  an existing record → soft `warning` (still inserts). Models/labels live in
  `src/domain/models/import.ts` (`ImportMode`/`RowStatus`/`RowAction`/
  `ImportPreview`/`ImportOutcome` + `summarizeRows`). Fully unit-tested
  (`domain/policies/__tests__/import-policy.test.ts`).
- **Use case owns the writes + the download.** `src/usecase/import/use-import.ts`
  (`useImport(gateways)`) is store-agnostic: it reads the file, re-derives the
  preview via a `buildPreview` closure whenever the mode changes, then commits
  row by row through injected `create`/`update`/`reload`. As with merge (#4), the
  list-page VM injects **its own store's** commands so the screen refreshes after
  import (the plain `useCustomers()`/`useProducts()` hooks would otherwise
  desync). `src/usecase/export/use-export.ts` (`useCsvExport`) isolates the Blob
  + `<a download>` side effect (UTF-8 BOM prepended for Excel-JP) so views stay
  pure.
- **View surface:** `components/import/ImportWizard.tsx` (render-only modal
  mirroring `ConfirmDialog`: file drop/pick, mode radios, a preview table with
  status badges + messages, summary chips, and the post-commit outcome) +
  `components/import/ExportButton.tsx`. The list pages hold a local `importOpen`
  flag and add the エクスポート / インポート / 新規登録 header cluster; the VMs
  expose `importer` (an `ImportController`), `exportCsv()`, and
  `downloadTemplate()`. Components may `type`-import from the use case (an
  established pattern here) but contain no business logic.

### Role-based access control (Issue #9)

Client-side **RBAC + row-level steward RLS + sensitive-field masking**, all
driven by a single pure domain policy. The demo runs as one Entra SSO user, so
roles are **app-resolved through the `AuthService` port** (not Entra app-roles)
and a header **role switcher** lets you demo each role live.

- **Why not Entra `@role` on the entities?** The live Fabric demo authenticates
  as a single SSO user with **no app-role assignments**. Switching the platform
  entities to `@role`/policy-DSL access would lock that user out and break the CD
  smoke test. So the PoC **keeps `@authenticated('*')`** on the entities and
  enforces authorization in the app; the production `@role`/RLS path is
  documented here but not wired. This matches the issue's PoC framing (it asks
  for a demo role switch).
- **Vocabulary is one source of truth.** `src/domain/models/authz.ts` defines the
  `Role` union (`viewer`=閲覧者 / `steward`=データスチュワード / `admin`=管理者)
  with `ROLE_LABELS`/`ROLE_DESCRIPTIONS`/`highestRole`, the `ResourceAction` union
  (`view/create/edit/delete/merge/changeStatus/import/export`), the `Actor` shape,
  and the sensitive-field lists (`SENSITIVE_CUSTOMER_FIELDS` = taxId・annualRevenue;
  products have none) + `MASKED_PLACEHOLDER`.
- **All authorization is one pure function.** `src/domain/policies/access-policy.ts`
  — `can(actor, action, resource?)` plus `isRecordSteward`/`canViewSensitive`/
  `canModifyAny`. Admin ⇒ everything; viewer ⇒ `view`/`export` only (sensitive
  fields masked); steward ⇒ view/export/create/import always, **and**
  edit/delete/merge/changeStatus **only on records they own** (steward field
  matches their email/name/id, case-insensitive) **or unassigned records**
  (`steward === ''`). No SDK, no React — 11 unit tests
  (`domain/policies/__tests__/access-policy.test.ts`).
- **Roles enter through the port; the switch lives in the app.** `toAuthUser(user,
  roles = ['admin'])` defaults the live SSO user to `admin`, so **no auth adapter
  changes** are needed. `AuthContext` owns `activeRole` (inits to
  `highestRole(grantedRoles)`, resets on sign-in/out) and derives the `actor`;
  `use-auth.ts` exposes `grantedRoles`/`activeRole`/`setActiveRole`/`actor`. The
  demo `components/auth/RoleSwitcher.tsx` (render-only) offers **all** roles so an
  admin can preview viewer/steward, wired into `AppShell` via its `controls`
  slot from `App.tsx`.
- **Gating is computed in the VM, applied in the page.** Detail/list VMs call
  `useAuth()` for the `actor` and expose booleans (`canEdit`/`canDelete`/
  `canChangeStatus`/`canMerge`/`canViewSensitive` on detail; `canCreate`/
  `canImport`/`canExport`/`canModify` on list) that **combine** the existing
  status rules with `can(...)`. Pages hide affordances accordingly: list header
  buttons + row 編集 (tables take an **optional** `onEdit`), detail edit/delete/
  status/統合/ロールバック controls, and the detail card **masks** taxId・
  annualRevenue with `MASKED_PLACEHOLDER` when `!canViewSensitive`. The form
  pages show a **403 message** instead of the form when the active role can't
  create (new) or edit that specific record (`vm.permitted`).
- **Production path (documented, not wired):** to enforce server-side, assign
  Entra app-roles, expose them via the `AuthService` port (replace the
  `['admin']` default), switch entities to `@role(...)`/policy access with a
  steward-scoped RLS predicate, and gate the CD smoke-test user with a role that
  can read. The client policy above stays as defence-in-depth.

### Change approval workflow (Issue #8)

Optional **maker-checker approval** for master edits, layered on top of the #9
role model. A header **demo toggle** (`承認フロー（デモ）`) routes customer/product
create+update through an approval queue instead of writing directly; an admin
reviews and, on approval, the payload is applied to the target master.

- **Why a demo toggle (default OFF)?** The live single-user Fabric demo and the
  CD smoke test must keep working with direct writes. `requireApproval` is an
  **app-layer flag owned by `AuthContext`** (like `activeRole`), exposed via
  `use-auth.ts` (`requireApproval`/`setRequireApproval`) and flipped from the
  `components/approval/ApprovalModeToggle.tsx` switch (render-only, wired
  through `AppShell.controls`). Off by default ⇒ existing flows unchanged.
- **The request is a first-class entity.** `rayfin/data/ChangeRequest.ts`
  (`@authenticated('*')`, registered in `schema.ts`) stores entityType/entityId/
  operation/`payload` (proposed `CustomerInput`/`ProductInput` as JSON, max 8000)/
  status/requestedBy/reviewedBy/reason/summary/requestedAt/reviewedAt. Domain model
  `src/domain/models/change-request.ts` adds JP label/tone helpers; the mapper
  `src/infrastructure/data/change-request-mapper.ts` guards payload JSON round-trip
  (6 mapper tests).
- **Rules are one pure policy.** `src/domain/policies/approval-policy.ts` —
  `canApprove` (**admin only** — do NOT reuse `canModifyAny`, which is true for
  stewards too), `isSelfReview`, `canReview`/`reviewBlockReason`
  (pending + approver + optional segregation-of-duties), and the non-mutating
  `applyDecision(request, decision, reviewer, reason, at)`. Segregation of duties
  (maker ≠ checker) is **optional** (`enforceSegregation`, default off) so one
  admin can demo submit→approve, then toggle it on to show the self-approval guard.
  16 unit tests.
- **Makers raise; the form contract carries the outcome.** Both form VMs return a
  `SubmitOutcome<T>` discriminated union (`src/usecase/shared/submit-outcome.ts`):
  when `requireApproval` is on, `submit()` calls `changeRequests.raise(...)` and
  returns `{status:'requested'}` (→ the form page navigates to `/approvals` with a
  notice banner) instead of `{status:'saved'}` (→ navigate to the detail). The
  `ChangeRequestRepository` port + `RayfinChangeRequestRepository` live behind DI
  (`changeRequests` in `AppDependencies`).
- **Approve = apply-then-persist, reusing the master stores.** The page VM
  `src/usecase/approval/use-approval-page.ts` composes `useCustomers()`+
  `useProducts()` to build an injected `apply(request)` gateway (customer/product ×
  create/update) and a `diffRecords` preview (current record → payload), then hands
  the reviewed decision to the store-agnostic controller
  `src/usecase/approval/use-change-requests.ts`. On approve the controller **applies
  the payload first, then** persists `applyDecision(...)` — a failed write never
  leaves a request marked approved (worst case: still pending, master untouched).
  The change-logging decorator repos audit the resulting master write automatically.
- **Render-only review UI.** `components/approval/RequestReviewCard.tsx` (operation/
  status badges, requester, `FieldDiffRow` diff preview, 承認/却下 + reason, gated by
  `canReview`/`blockReason` props) inside `ApprovalQueue.tsx`; thin
  `pages/ApprovalPage.tsx` reads the VM, shows the approver a pending queue + a
  segregation checkbox and everyone a read-only history, and surfaces the post-submit
  notice from `useLocation().state`. Route `/approvals` + `AppShell` nav entry「承認」.

### Hierarchy & relationships (Issue #7)

Two complementary hierarchies, both driven by **one pure, cycle-safe policy** so no
per-entity tree code is duplicated: **customer org relationships** (parent company →
subsidiary/branch/group) and a **product category master** (a reference tree products
attach to). Additive & backward-compatible — every hierarchy column is optional, so
existing records and the CSV round-trip are untouched.

- **The tree logic is a single reusable policy.** `src/domain/policies/hierarchy-policy.ts`
  operates on the minimal shape `HasHierarchy = { id; parentId? }` and is pure:
  `childrenOf` / `rootsOf` / `ancestorsOf` (nearest→root) / `descendantIds` /
  `subtreeIds` / `siblingsOf` / `parentCandidates` (self + descendants excluded) /
  **`wouldCreateCycle`** / `buildForest` → `flattenForest` (depth-annotated rows).
  Any model that satisfies `HasHierarchy` (both `Customer` and `Category` do) gets the
  whole tree toolkit for free. **20 unit tests** lock the edge cases (dangling parent →
  treated as root, cycle detection, ordering). When adding a third hierarchy, reuse this
  policy — do **not** write bespoke traversal.
- **Customer relationships are two optional columns.** `Customer.parentId?` +
  `Customer.relationType?` (`headquarters`/`subsidiary`/`branch`/`group`, JP labels in
  `customer.ts`) threaded end-to-end: entity → mapper (`toCustomer`/`customerInputToFields`
  normalize blank→undefined) → form parent-picker → detail「関連・階層」panel → list
  ancestor/rollup filter. 5 mapper tests cover the parentId/relationType round-trip.
- **The product category master is its own entity + domain model.** New
  `rayfin/data/ProductCategory.ts` (`@authenticated('*')`, registered in `schema.ts`):
  id/code(unique)/name/parentId?/description?/audit. **Naming caution:** a *flat*
  `ProductCategory` union (electronics/apparel/…) already exists in `product.ts` for the
  legacy `Product.category` `@set`; to avoid the collision the **domain model is named
  `Category`** (`src/domain/models/category.ts`), and the mapper imports the entity as
  `ProductCategoryEntity`. The legacy flat `Product.category` stays as-is; a **new optional
  `Product.categoryId?`** references the `Category` master (the backward-compatible
  migration path). 6 category-mapper tests cover the round-trip.
- **Category CRUD lives in one management VM.** `src/usecase/categories/use-category-management-page.ts`
  composes `useCategories()` (store, mirrors `use-customers.ts`) + `useProducts()` (for the
  delete guard's product-reference count) + `useAuth().actor`. It builds the flattened tree
  rows, offers cycle-safe parent options (`parentCandidates` on edit), and **guards delete**
  when a node has children **or** referencing products (`canDelete`/`deleteBlockReason`).
  RBAC reuses `canModifyAny(actor)` (admin+steward; viewers read-only) — the category master
  needs no status/merge/approval. Code-uniqueness is pre-checked for a friendly message before
  the entity's `unique` constraint fires.
- **Render-only hierarchy UI, reusable picker.** `components/shared/ParentPicker.tsx` (a
  render-only `SelectField` wrapper that prepends a「親なし」root option; usable by any
  hierarchy) + `components/category/HierarchyTree.tsx` (depth-indented rows with child/product
  counts and manage actions gated by `canManage`, delete disabled with reason tooltip) +
  `components/category/CategoryForm.tsx` (code/name/ParentPicker/description). Thin
  `pages/CategoryManagementPage.tsx` + route `/categories` + `AppShell` nav「カテゴリ管理」.
  The product form gains an optional category-master picker (`categoryOptions`, indented) and
  the product detail shows the root→self「カテゴリ階層」breadcrumb (`categoryPath`) — both
  computed in the product VMs via `ancestorsOf`, never in the view.

### Steward workqueue (Issue #10)

A prioritized, cross-master **"needs attention" queue** for data stewards. It is a
pure *composition* of the policies you already have — **no new persisted entity** —
so it stays correct automatically as the underlying quality/duplicate/validation
rules evolve.

- **The queue is a derived signal, never stored.** `src/domain/models/steward-task.ts`
  defines a route-free `StewardTask` (one per record, id `${entityType}:${recordId}`,
  aggregating every reason it matched) + the `TaskReason` union
  (`missing_required`/`low_quality`/`duplicate`/`stale_draft` with JP
  labels/descriptions/tones) + `StewardWorkload`. `src/domain/policies/steward-task-policy.ts`
  is pure and **composes existing policies** — `evaluate*Quality`, `find*Duplicates`
  + `duplicateIdSet`, `validate*Input` (fed via `*ToInput`), `*StatusLabel`. Do **not**
  re-derive quality/dedup/validation here; call the canonical policy. **20 unit tests**
  lock every reason rule, the merged/archived exclusion, the severity ordering
  (`reasons.length*100 + (100 - qualityScore)`, ties → oldest `updatedAt` first), and
  the workload grouping (incl. the null/unassigned bucket + busiest-first sort).
- **`now` is injected for deterministic staleness.** `StewardTaskContext { now?,
  qualityThreshold? (50), staleDraftDays? (14) }` — the policy never calls `new Date()`
  itself when a context is supplied, so `stale_draft` is testable. Any future
  time-based rule must take `now` the same way.
- **The view-model owns navigation + writes; the policy stays route-free.**
  `src/usecase/workqueue/use-steward-workqueue.ts` (`useStewardWorkqueuePage()`) composes
  `useCustomers` + `useProducts` + `useAuth`, turns tasks into `WorkQueueRow`s
  (computing `detailPath`/`editPath`), and applies filters (`WorkQueueScope`
  all/mine/unassigned, `ReasonFilter`) + a selection `Set`. Bulk **assign** guards
  **per record** with `can(actor, 'edit', record)` and writes via
  `update{Customer,Product}({ ...toInput(record), steward: target })`, tallying
  denied/failed — RBAC is enforced at the write, not just hidden in the UI. A stable
  `now` is captured once via `useState(() => new Date())`.
- **Render-only components, one per file.** `components/workqueue/`: `TaskReasonBadge`,
  `WorkQueueList` (static `Link`s to detail/edit; selection checkbox only when
  `canManage && row.canEdit`), `StewardAssignPicker` (bulk-assign bar),
  `StewardWorkloadTable` (per-steward bars — **reused on the dashboard**). Thin
  `pages/WorkQueuePage.tsx` + route `/workqueue` + `AppShell` nav「ワークキュー」.
- **Dashboard rollup reuses the same policy + component.** `use-dashboard.ts` adds
  `stewardWorkloads` via `stewardWorkloads(deriveStewardTasks(...))` (same pattern as the
  existing `findCustomerDuplicates` call there) and `DashboardPage` renders
  `StewardWorkloadTable` — the queue and the dashboard never diverge.

### Data quality rules & cleansing (Issue #11)

**Standardization / cleansing** proposes normalized replacements for individual
fields, surfaces a **per-field quality breakdown** on the detail pages, and rolls
records needing attention into a prioritized **是正キュー (remediation queue)**. It
reuses the existing quality + validation policies — there is **no new persisted
entity** — so it stays correct as those rules evolve.

- **Normalizers are pure & idempotent.** `src/lib/normalize.ts` holds the
  framework-free primitives (`toNfkc`, `normalizeName`, `normalizeEmail`,
  `normalizePhone`, `normalizePostalCode`, `normalizeBarcode`, `normalizeUrl`).
  Every one satisfies `f(f(x)) === f(x)` so a suggestion can be re-applied safely.
  **Any new cleansing primitive MUST be pure, live here, and add an idempotency
  test** (`src/lib/__tests__/normalize.test.ts`).
- **One rule table drives both suggest and apply.** `src/domain/policies/cleansing-policy.ts`
  defines `CleansingRule<T> { field, label, reason, normalize }` tables per master
  (`CUSTOMER_RULES` / `PRODUCT_RULES`). `suggest*Cleansing(input)` emits a
  `CleansingSuggestion { field, label, current, suggested, reason }` **only when the
  current value is non-empty AND normalization changes it** (clean record → no
  suggestions). `applyCleansing(input, suggestions)` returns a **non-mutating** shallow
  copy. Add a field by extending the table — never hand-roll a normalizer at a call site.
- **The remediation queue is a derived signal, never stored.**
  `deriveRemediationTargets(customers, products, ctx?)` (+ the per-master
  `derive{Customer,Product}Remediation`) excludes `merged`/`archived`, and surfaces a
  record when it has suggestions **OR** validation fails (`missingRequired`) **OR** its
  quality score is below `ctx.qualityThreshold` (default 50). `RemediationTarget` carries
  JP-labelled `missingFields`/`issues` (render directly). Ordering (`compareTargets`) is
  worst-score-first, more-suggestions as tie-break, then stable by id. **19 unit tests**
  in `cleansing-policy.test.ts` lock suggestion emission, non-mutation, the exclusions,
  the threshold, `missingRequired`, and the sort order.
- **Quality policies now expose the breakdown.** `evaluate*Quality` emit
  `factors: QualityFactor[] { key, label, filled, weight }` + `issueDetails:
  QualityIssueDetail[] { message, penalty }` alongside the unchanged score/band. The
  per-field breakdown UI reads `factors`/`issueDetails` — **do not recompute penalties
  in the view**; extend the policy if a new factor is needed.
- **Store-agnostic apply controllers (usecase).** `src/usecase/quality/use-cleansing.ts`
  is the injected apply controller (`apply`/`applyAll`, `applyingId`, `bulkApplying`,
  `error`, `lastSummary`) guarded by `can(actor, 'edit', record)`;
  `use-remediation-page.ts` composes `useCustomers` + `useProducts` + `useAuth` +
  `deriveRemediationTargets` into the `/remediation` VM (entity/`onlyWithSuggestions`
  filters, `applyAllVisible`). Both detail VMs (`use-*-detail-page.ts`) expose
  `cleansingSuggestions` + `applyCleansing` so a record can be standardized in place,
  reusing the detail VM's **own** store (no context store).
- **Render-only components, one per file.** `components/quality/`:
  `QualityBreakdownList` (factors grid + issue details), `CleansingSuggestionRow`
  (current→suggested + reason), `QualityPanel` (breakdown + suggestions + apply-all,
  rendered on both detail pages after the detail card), `RemediationQueue` (per-row
  apply + links, used by `pages/RemediationPage.tsx`). Route `/remediation` + `AppShell`
  nav「是正キュー」; `DashboardPage` adds a「データ品質・是正」rollup (是正対象件数 /
  標準化候補あり) linking to the queue via `use-dashboard.ts`'s
  `remediationCount`/`cleansingSuggestionCount`.

### Distribution & integration (Issue #12)

**Distribution / integration** records a business event onto a persisted
**outbox** whenever a master record changes (transactional-outbox pattern), and
lets a steward review + manually deliver those events, export the active masters
as **CSV/JSON**, and configure a **webhook** target. Per the issue, the PoC
minimum is an in-app event feed + export + a **log-only** webhook — so no real
HTTP egress happens on the live Fabric demo.

- **The outbox is the one new persisted entity.** `rayfin/data/OutboxEvent.ts`
  (`entityType` customer/product · `entityId` · `eventType`
  created/updated/merged/status_changed · `payload` JSON @text max 8000 optional ·
  `actorId` · `status` pending/delivered/failed · `occurredAt` · `deliveredAt?`),
  registered in `schema.ts` (additive — safe on `rayfin up`). Mapped to the
  view-facing `domain/models/distribution` by `infrastructure/data/outbox-event-mapper.ts`
  (`parsePayload` → `{}` on invalid/non-object; `serializePayload` guards 8000 and
  falls back to `{id,_truncated:true}`; `toOutboxEvent` maps dates/optionals).
- **Events are emitted by a decorator, not the usecase.** `infrastructure/data/`
  `distribution-{customer,product}-repository.ts` wrap the base repo (OUTSIDE the
  change-logging decorator) behind the same `*Repository` port and `safePublish`
  (non-fatal) an outbox event on create / update (diff-gated) / setStatus (changed) /
  markMerged / restoreMerged. One write therefore yields **both** an audit
  `ChangeLog` entry AND an `OutboxEvent`; the usecase layer is unaware. `remove`
  emits nothing (no delete event kind). Composition root nests them as
  `new Distribution*Repository(new ChangeLogging*Repository(new Rayfin*Repository(...),
  changeLog, actor), outbox, actor)`.
- **All distribution decisions are a pure policy.**
  `src/domain/policies/distribution-policy.ts` is the single source of truth:
  `isDistributable(status)` / `selectDistributable` (**active-only** — drafts,
  inactive, archived, merged are withheld); `customerEventPayload` /
  `productEventPayload` (compact snapshots); `filterEvents(events, EventFilter)`
  (entityType/eventType/status/since, AND-combined, non-mutating);
  `customer/productExportMatrix` (header + active rows, reuses the #6
  `*_CSV_HEADERS`/`*ToCsvRow`); `buildCustomer/ProductJsonExport(records, now)`
  (envelope `{entityType, exportedAt, count, records}`, `now` injected);
  `signPayload(secret, json)`. No IO/SDK/DOM here.
- **Webhook is log-only in the PoC; signing is a DEMO digest.** The
  `HttpClient` port (`src/domain/ports/http-client.ts`) has two adapters:
  `FetchHttpClient` (real `fetch`, **not** wired live) and `LoggingHttpClient`
  (console-only, returns `{status:200, ok:true}`, no egress) — the DI root wires
  **`LoggingHttpClient`** so the live demo stays CORS-safe and side-effect-free.
  `signPayload` is an honest **non-cryptographic djb2** digest labelled `v1=<hex>`,
  used only to illustrate the signature header. **Production signing MUST use Web
  Crypto `HMAC-SHA256`** (async) inside a new `infrastructure/http` adapter — do
  NOT ship the djb2 digest as real security. This mirrors the #9 "documented-only
  production path" decision.
- **Usecase composes stores + IO.** `src/usecase/distribution/use-distribution.ts`
  (`useDistributionPage`) loads `outbox.list()`, composes `useCustomers` +
  `useProducts` + `useAuth` for active-only export, and exposes filters,
  permission-gated manual delivery (`markDelivered`/`markFailed`/`deliverAllVisible`
  via `outbox.setDeliveryStatus`, gated by `canModifyAny(actor)`), export actions
  (`useCsvExport`'s `exportMatrix`/`exportJson`), and a log-only webhook test
  (`httpClient.post`, also gated). A stable `now` (`useState(() => new Date())`)
  keeps the since-window from drifting across renders.
- **Render-only components, one per file.** `components/distribution/`:
  `OutboxEventFeed` (domain/kind/delivery badges via the model's label+tone
  helpers, payload summary, mark buttons via props), `ExportPanel` (active counts +
  CSV/JSON buttons), `WebhookTargetCard` (url/secret/active + signature preview +
  test-send). Thin `pages/DistributionPage.tsx`; route `/distribution` + `AppShell`
  nav「配信・連携」. **29 unit tests** (`distribution-policy.test.ts` + `outbox-event-mapper.test.ts`)
  lock the active-only selection, filtering, payload/export/JSON shapes, `signPayload`
  determinism, and the mapper round-trip/guards.

### Analytics & reporting (Issue #13)

**Analytics enhancement** deepens the dashboard with a **quality trend
time-series**, **KPI drill-down** into filtered list views, **per-group
breakdowns** (by master / steward / product category), and **report export**
(CSV + browser print). It is pure composition of the existing quality /
duplicate / validation policies over the current in-memory records — **no new
persisted entity**. (Historical trend points are derived from each record's
`createdAt` cohort, since the PoC has no per-day quality snapshot store; this is
documented as the honest PoC limitation.)

- **All analytics math is a pure policy.** `src/domain/policies/analytics-policy.ts`
  is the single source of truth: `buildQualityTrend(records, window, now)`
  (cumulative-cohort avg quality + active ratio per day, clamped to
  `MAX_TREND_DAYS=365`, `now` injected for determinism); `groupBreakdown(items,
  keyOf)` → `GroupBreakdown[]` (count + avg quality + low-quality count per
  group); `reportToMatrix(sections)` flattens `ReportSection[]` → a CSV matrix.
  `src/domain/models/analytics.ts` owns the vocabulary: `TrendWindowDays`
  (7/30/90/0=all) + `TREND_WINDOW_VALUES`/`trendWindowLabel`, `QualityTrendPoint`,
  `GroupBreakdown`, and the drill-down contract `DrilldownFilter {entity, status?,
  quality?:'low'}` + `describeDrilldown`. No IO/SDK/DOM. **16 unit tests**
  (`analytics-policy.test.ts`).
- **Drill-down is router state, resolved by the list page.** A dashboard KPI card
  (`StatCard` now takes an optional `onClick` → renders a `<button>`) calls
  `navigate('/customers'|'/products', { state: { drilldown: { entity, quality:'low' } } })`.
  The list page reads `useLocation().state?.drilldown`, keeps only its own
  entity, maps it via a local `toSeed()` → `Partial<*ListFilters>`, and passes it
  as the list VM's `seed` (the VM lazily initialises its filters from the seed
  **once**). A sky drill-down banner (`describeDrilldown` + a「すべて表示」clear
  button) resets the filters and `navigate(pathname, {replace:true})` to drop the
  state. The **quality quick-filter** (`quality: 'all'|'low'`, band = low) lives on
  both list selectors + filter components (品質 select) so the drill-down and the
  manual filter share one code path. **8 unit tests** (customer/product
  `selectors.test.ts`) lock the `band === 'low'` filter + unfiltered `total`.
- **Report output isolates the DOM in the usecase layer.**
  `src/usecase/analytics/use-report-export.ts` (`useReportExport(sections)`) turns
  the dashboard's pure `reportSections: ReportSection[]` into a downloadable CSV
  (via the shared `useCsvExport().exportMatrix` + `reportToMatrix`) and exposes
  `window.print()` — so `components/analytics/ReportExportButton` stays render-only.
- **The dashboard hook is the composition point.** `use-dashboard.ts` builds
  `trend` (with `trendWindow`/`setTrendWindow`), `entityBreakdown` /
  `stewardBreakdown` / `categoryBreakdown`, and `reportSections` inside `useMemo`s
  over the loaded customers/products; the `DashboardPage` renders the trend section
  (window `SelectField` + `QualityTrendChart` + `ReportExportButton`), three
  `BreakdownTable`s, and the clickable 低品質 KPIs. Components in
  `components/analytics/` (`QualityTrendChart` dependency-free SVG, `BreakdownTable`,
  `ReportExportButton`) are all render-only.

### Power BI report embedding (BIレポート tab)

The **BIレポート** tab embeds a *genuine* Power BI report over the MDM data using
the official `powerbi-client-react` library — it does **not** hand-roll chart
visuals (a `recharts`/SVG "Power BI-style" dashboard was explicitly rejected).
When no report is configured it shows a professional setup card, never a fake
chart.

- **Clean-arch seam (config → port → adapter → hook → component → page):**
  - Domain: `domain/models/report-embed.ts` — a discriminated union
    `ReportEmbedConfig = TokenEmbedConfig(kind:'token') | SecureEmbedConfig(kind:'secure')`
    plus the pure `buildSecureEmbedUrl()` (imports nothing outward, unit-tested).
    `domain/ports/report-embed-provider.ts` — `ReportEmbedProvider.getReportEmbed(): ReportEmbedConfig | null`.
  - Infra: `infrastructure/reporting/config-report-embed-provider.ts` —
    `ReportEmbedSettings` (all optional) + `ConfigReportEmbedProvider`, which
    picks a mode from whatever config is present (token when embedUrl+accessToken;
    explicit `secureEmbedUrl`; else build a secure URL from ids; else `null`).
    Pure + synchronous → unit-tested without a DOM.
  - Config: `infrastructure/config/env.ts` reads `VITE_POWERBI_*` into
    `AppConfig.reportEmbed` via throw-free `readReportEmbedSettings()`
    (workspace/tenant fall back to `VITE_FABRIC_*`). This is the ONLY module that
    touches `import.meta.env`; keep it throw-free so the CI pure-build gate stays
    green when vars are absent.
  - DI: `AppDependencies.reportEmbed: ReportEmbedProvider`, built in the
    composition root `create-dependencies.ts` from `config.reportEmbed`.
  - Usecase: `usecase/report/use-report-embed.ts` (`.ts`, no JSX) — thin
    `useMemo` over the port; returns `{ config, ready }`.
  - Component: `components/report/PowerBIReport.tsx` — the ONLY place that imports
    `powerbi-client` / `powerbi-client-react` (a separate package from
    `@microsoft/rayfin`, so it doesn't trip the SDK-location grep). Token →
    `<PowerBIEmbed>` (`models.TokenType.Aad|Embed` from `powerbi-client`); secure →
    a token-less `<iframe>`; `null` → JP setup card. Takes config via props (never
    imports `@/infrastructure`).
  - Page/route/nav: thin `pages/ReportPage.tsx`; route `/report` in `App.tsx`;
    `NAV_ITEMS` entry「BIレポート」right after ダッシュボード in `AppShell.tsx`.
- **Two modes.** `secure` (autoAuth SSO) is the default live path: a token-less
  `https://app.powerbi.com/reportEmbed?reportId=&groupId=&autoAuth=true[&ctid=]`
  URL that authenticates the *viewer* (the same Entra user who can already see the
  workspace) directly in the iframe — no token handling. `token`
  (App/User-Owns-Data) is an advanced path needing a server-minted AAD/Embed
  token. **There is no in-browser Power BI AAD token** available from Rayfin/Fabric
  auth (`client.auth.getSession()` is scoped to the Rayfin API), which is why
  secure-embed is preferred.
- **Env vars (all optional; unset ⇒ setup card):** `VITE_POWERBI_REPORT_ID`
  (only one strictly needed for a secure embed), `VITE_POWERBI_WORKSPACE_ID` /
  `VITE_POWERBI_TENANT_ID` (fall back to `VITE_FABRIC_*`),
  `VITE_POWERBI_SECURE_EMBED_URL` (explicit override), and for token mode
  `VITE_POWERBI_EMBED_URL` / `VITE_POWERBI_ACCESS_TOKEN` / `VITE_POWERBI_TOKEN_TYPE`.
- **Deploy injection.** `rayfin env` only maps *known* Rayfin/Fabric keys, so
  `VITE_POWERBI_*` are plain Vite vars read from the process env at build time.
  `deploy.yml` has a **Configure Power BI embedding** step that exports the repo
  variables `POWERBI_REPORT_ID` / `POWERBI_WORKSPACE_ID` / `POWERBI_TENANT_ID` /
  `POWERBI_SECURE_EMBED_URL` into `$GITHUB_ENV` **before** `rayfin up` runs its
  internal `vite build`, baking them into the deployed bundle. An access token, if
  ever used, must be a GitHub **secret**, not a variable.
- **Connecting a real report (one-variable step).** The demo workspace currently
  has 0 semantic models / 0 reports, so the tab shows the setup card. To light up a
  live embed: (1) in Fabric workspace `rayfin-demo`, create a semantic model + Power
  BI report over the MDM SQL data (SQLEndpoint `mdm`), (2) enable secure embed, copy
  the report id, (3) set the repo **variable** `POWERBI_REPORT_ID` (Settings →
  Secrets and variables → Actions → Variables) and cut a release tag. For local dev,
  add `VITE_POWERBI_REPORT_ID=<id>` to `mdm/.env.local`. Workspace/tenant are reused
  from the existing Fabric config automatically.
- **Tests:** `domain/models/__tests__/report-embed.test.ts` (secure-URL params,
  ctid present/absent, encoding) + `infrastructure/reporting/__tests__/config-report-embed-provider.test.ts`
  (each mode branch + null cases). Baseline grew 425 → 441.

### Deployment (Fabric)

The PoC is deployed to Microsoft Fabric. Deploy with `npx rayfin up -y` from the
project root (credentials are cached; check with `npx rayfin login status` and
re-auth via `npx rayfin login -t <tenant>` only if expired). Verify with
`npx rayfin up status`.

The concrete deployment identifiers (tenant, workspace, item, and SQL Database
ids, plus the live hosting URL) are **not committed** — they live in the
gitignored `rayfin/.deployments.json` and `rayfin/.env`. Run `npx rayfin up -y`
to deploy and populate your own.

- **Tenant:** `<fabric-tenant-id>`
- **Fabric workspace:** `rayfin-demo` (`<workspace-id>`)
- **Rayfin item (AppBackend):** `mdm` — `<item-id>`
- **SQL Database:** `mdm` — `<sql-database-id>`
- **Live app (static hosting):** `<static-hosting-url>`
- **Services:** `auth` enabled, `data` enabled (Data API Builder over the SQL DB).

`rayfin up` regenerates the DAB config from `rayfin/data/*` and applies it on
each deploy; use `--dry-run` to preview and `--force` only when you knowingly
accept destructive schema changes. All entities are `@authenticated('*')` because
anonymous access is not supported on Fabric.

#### Deployed-schema drift (root cause + fix)

Symptom seen in the live app: a red GraphQL banner ("field `parentId` /
`relationType` / `mergedInto` / `mergedAt` does not exist on `Customer`") and
every KPI at 0. Cause: the backend GraphQL type is **generated from the SQL
columns** by Data API Builder, so a column the deployed DB lacks becomes a
missing field and the whole query is rejected → no data anywhere.

Root cause of the drift: four JSON columns had been authored with
`@text({ max: 8000 })` (`ChangeLog.changedFields`, `MergeRecord.winnerBefore`,
`ChangeRequest.payload`, `OutboxEvent.payload`). `rayfin up db apply` runs a
**schema validation that aborts the ENTIRE apply** when any `@text` max exceeds
4000. So none of the migrations from issues #4/#5/#7/#8/#12 ever reached the DB —
five whole tables and several columns silently never got created — while the
static bundle kept deploying green on every tag (the failed schema step is
non-fatal to the overall `rayfin up`, and CI's HTTP-200 smoke test only probes
the static shell). Fix: bound the four fields to `max: 4000` (done) and re-apply.

Apply / re-apply the schema to the deployed DB as the workspace owner:

```bash
export RAYFIN_TOKEN="$(az account get-access-token \
  --resource https://api.fabric.microsoft.com --query accessToken -o tsv)"
npx rayfin up db apply --verbose   # schema-only: DDL + DAB config, no static build
```

`db apply` reads `rayfin/.env` + `rayfin/.deployments.json` (no `--workspace` flag);
watch for "✅ Configuration applied successfully!". Adding new tables and nullable
columns is additive, so existing seeded rows survive (verified: Customers/Products
kept their rows). To confirm, inspect the live SQL directly with the same
token-based connection `scripts/seed.mjs` uses (`--resource
https://database.windows.net/`, `azure-active-directory-access-token`; split the
`serverFqdn`'s `,1433` suffix into `server`/`port`, and retry once on a cold
serverless "socket hang up"). Re-seed with `npm run seed` only if a table is empty.

Guardrails so this can't recur: the `entity-text-limits.test.ts` unit test fails
the build if any entity `@text` max exceeds 4000. A full `rayfin up` from CI
re-applies the (now valid) schema on each `vX.Y.Z` release; because the failed
schema step is non-fatal, the human owner should run `rayfin up db apply` after
any schema change if the CI service principal cannot perform the DDL.

### CI/CD (GitHub Actions)

Two workflows in `.github/workflows/` automate quality gates and deployment.

- **`ci.yml` — pull-request gate.** Triggers on PRs to `main` (and manual
  dispatch). Runs `npm ci` → `npm run lint` → `npx tsc -b` → `npm test` →
  `npx vite build` on Node 22. **No cloud credentials.** `rayfin/.env` is
  gitignored (absent in CI), so the build runs without real `RAYFIN_PUBLIC_*`
  values — it is purely a compile/bundle gate; the value-injected build happens
  at deploy time. Call the tools directly (not `npm run build`) to skip the
  `prebuild` → `rayfin env` hook.
- **`deploy.yml` — release deployment.** Triggers on pushing a **semantic
  version tag** `vX.Y.Z` (e.g. `v1.2.3`; and manual dispatch), pinned to the
  `production` environment. Re-runs the same gates (fail-fast), then deploys to
  Fabric and smoke-tests the live URL (HTTP 200, with retries for CDN
  propagation). A plain push to `main` does **not** deploy — cut a release by
  tagging: `git tag v1.2.3 && git push origin v1.2.3`. Keeping
  `environment: production` means the OIDC subject stays
  `…:environment:production` regardless of tag name, so the existing federated
  credential matches (no per-tag credential needed).

**Auth model — GitHub OIDC, no stored secret** (the repo is public, so a
long-lived client secret is deliberately avoided):

```
GitHub OIDC token (id-token: write)
  → azure/login@v2            (federated credential on the Entra app)
  → az account get-access-token --resource https://api.fabric.microsoft.com
  → RAYFIN_TOKEN              (ambient bearer token; the rayfin CLI consumes it
                               and bypasses MSAL — one Fabric-scoped token drives
                               the entire `rayfin up`)
  → npx rayfin up -y --workspace-id <FABRIC_WORKSPACE_ID>
```

The Entra **service principal needs no Azure subscription or RBAC** — Fabric
authorizes it via the org-wide *"service principals can call Fabric public APIs"*
tenant setting plus an **Admin** role on the target workspace (grant via Fabric
REST `POST /v1/workspaces/{id}/roleAssignments` with the SP **object id**,
`type: ServicePrincipal`). `rayfin up` resolves the existing `mdm` item by
display name and updates it in place, so CI redeploys are **idempotent** (no
duplicate item) even though `rayfin/.deployments.json` is gitignored.

**Repository configuration** (set via `gh secret/variable set`; not committed):

| Kind     | Name                  | Meaning                                            |
| -------- | --------------------- | -------------------------------------------------- |
| secret   | `AZURE_CLIENT_ID`     | Entra app (client) id used for OIDC login          |
| secret   | `AZURE_TENANT_ID`     | Entra tenant id                                     |
| variable | `FABRIC_WORKSPACE_ID` | target Fabric workspace (public-by-design)         |

Plus a `production` **environment** and **two federated credentials** on the app
(subjects `repo:<owner>/<repo>:ref:refs/heads/main` and
`repo:<owner>/<repo>:environment:production` — the environment subject is the one
that matches when the deploy job declares `environment: production`).

**To re-provision from scratch** (new fork/tenant): create the Entra app + SP,
add the two federated credentials (issuer `https://token.actions.githubusercontent.com`,
audience `api://AzureADTokenExchange`), grant the SP Admin on the workspace,
then set the three repo config values above. **To rotate:** nothing to rotate —
OIDC mints a short-lived token per run; revoke by deleting the federated
credentials or the SP's workspace role.

### Demo data seeding

The PoC ships with a reproducible seeder that populates the deployed Fabric SQL
Database with representative **顧客マスタ / 製品マスタ** records so the dashboard,
duplicate detection, and quality scoring have meaningful data to demonstrate.

```
az login            # once, as the app deployer (SQL DB owner)
npm run seed        # → scripts/seed.mjs
```

- **Direct SQL, by necessity.** The Rayfin **data plane** (`/graphql`) requires a
  brokered, workload-scoped Fabric token that is only issued inside the portal
  iframe flow, so it cannot be driven headlessly. The **SQL Database** accepts a
  standard AAD token (`https://database.windows.net/`, minted by `az`), and it is
  the same store DAB reads — so the seeder writes there directly.
- **Auto-resolution.** The script reads the active workspace id from
  `rayfin/.deployments.json`, matches the SQL Database by `displayName === <app
  name>` via the Fabric REST API, and mints both tokens through `az`. Override with
  `SEED_SQL_SERVER` / `SEED_SQL_DATABASE` / `SEED_WORKSPACE_ID` / `SQL_TOKEN`.
- **Idempotent.** It `DELETE`s existing `Customers`/`Products` rows first, then
  inserts 12 + 12 records (auto-filling `id`/`createdAt`/`updatedAt`/`createdBy`/
  `updatedBy`), with timestamps descending 3h apart for a meaningful "最近の更新".
- **Intentional demo scenarios** (keep aligned with `domain/policies/` if you edit):
  a status spread (draft/active/inactive/archived · discontinued), a quality spread
  (high/medium/low, incl. active-without-steward and invalid-email issues), and
  three duplicate pairs — customers sharing an email, customers whose names differ
  only by the 会/會 kanji variant, and products sharing a barcode + near-identical
  name. `mssql` is a **devDependency** only (not bundled into the app).

### Roadmap & coverage (planned enhancements)

The PoC is measured against the **12-domain general MDM functional requirements**
laid out at project kickoff. Current breadth is **~100%** (all 12 domains
implemented for the PoC scope). Coverage by domain:

- ✅ **Implemented (12):** データモデリング / データ品質（標準化・クレンジング・是正キュー・項目別品質内訳, #11） / 検索・参照 / 分析・レポート（品質トレンド時系列・KPIドリルダウン・構成別内訳・CSV/印刷レポート出力, #13） /
  バージョン管理（変更履歴・フィールド差分・ロールバック, #5） /
  名寄せ（重複検出＋マージ実行・survivorship・ゴールデンレコード・統合解除, #4） /
  オンボーディング（手動フォーム＋CSV一括インポート/エクスポート・行検証プレビュー, #6） /
  セキュリティ（ロールベース認可・スチュワード行レベル制御・機密項目マスキング, クライアント側, #9） /
  ワークフロー・承認（maker-checker・承認キュー・職務分掌トグル・差分プレビュー, #8） /
  階層・関係管理（顧客組織関係＋製品カテゴリマスタ・循環防止・ドリルダウン, #7） /
  ガバナンス・スチュワードシップ（品質・重複・滞留・必須未入力を横断集約した優先度付きワークキュー＋担当者別ワークロード, #10） /
  配信・連携（アウトボックス・イベントフィード・CSV/JSONエクスポート・Webhook（PoCは送信ログのみ）, #12）.
- ❌ **Not implemented (0)** — 全ギャップ #4–#13 を実装完了。残るのは各機能の本番強化（例: #9 の @role/RLS 本番経路、#12 の HMAC 署名・実 HTTP 送信、#13 の日次品質スナップショット蓄積）のみ。

**Tracking:** the coverage matrix and roadmap live in **Epic #3**
(`[Epic] MDM機能カバレッジと不足機能の実装ロードマップ`) — the single source of
truth. Ten child issues carry per-gap implementation plans (each written to the
clean-architecture layer map above):

| Pri | Issue | Domain / gap | `area:` label |
| --- | ----- | ------------ | ------------- |
| P1 | #4  | 名寄せ: マージ実行・survivorship・ゴールデンレコード ✅ **done** | `matching` |
| P1 | #5  | 変更履歴・バージョン管理（フィールド差分・タイムライン） ✅ **done** | `versioning` |
| P1 | #6  | 一括インポート/エクスポート（CSV） ✅ **done** | `onboarding` |
| P2 | #7  | 階層・関係管理（企業グループ／製品カテゴリ／顧客拠点） ✅ **done** | `hierarchy` |
| P2 | #8  | 変更承認ワークフロー（maker-checker） ✅ **done** | `workflow` |
| P2 | #9  | ロールベース認可・行レベルセキュリティ（@role/RLS） ✅ **done** (client-side) | `security` |
| P2 | #10 | スチュワードシップ・ワークキュー ✅ **done** | `governance` |
| P3 | #11 | データ品質ルール拡張（標準化・クレンジング・是正キュー） ✅ **done** | `quality` |
| P3 | #12 | 配信・連携（下流公開・Webhook/イベント・API） ✅ **done** | `distribution` |
| P3 | #13 | 分析強化（品質トレンド・時系列・レポート出力） ✅ **done** | `analytics` |

When picking up feature work: start from the relevant child issue, follow its
per-layer plan and the **Layer map** / **Conventions** above, keep new copy in
Japanese, and tick the item off the Epic #3 checklist when done. Dependencies to
respect — #13 (analytics trends) needs #5 (change history); #12 (distribution)
reuses #6's CSV lib and #5's write-hook; #10/#8 align with #9's roles. Labels
`epic`, `priority:P1–P3`, and `area:*` already exist in the repo (`gh label list`).
