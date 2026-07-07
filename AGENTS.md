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
- **In-app guide** — an **MDMガイド** tab explaining MDM concepts (用語・課題) and
  how to operate the app (static, presentational; no state/ports). Each usage step
  and a「主要ページへのショートカット」section link straight to the relevant routes
  (dashboard / list / new) so readers can jump into the app from the guide.

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

To add a master field: update the `@entity` (+ `schema.ts`), the domain model +
`*ToInput`/`empty*Input` + validation/quality policy, the mapper in
`infrastructure/data/`, then surface it in the form/detail/table components. Run
`npm run build && npm run lint && npm run test` before deploying with `rayfin up`.

To add a screen/tab: create a render-only component under
`src/components/<feature>/`, a thin container `src/pages/<Feature>Page.tsx`
(one VM hook, or none for static content), register a declarative `<Route>` in
`src/App.tsx`, and add the `NAV_ITEMS` entry in
`src/components/layout/AppShell.tsx`. Keep all labels/copy in Japanese.

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
