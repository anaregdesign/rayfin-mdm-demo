# Project Bootstrap

Use this guide when starting a new Rayfin app from scratch. (Facts below were
verified against `@microsoft/create-rayfin` 1.33.2, 2026-07; re-verify with
`--list-templates` and the generated `package.json` if versions have moved.)

## Baseline Assumptions

A Rayfin app uses this stack:

- TypeScript with TC39 Stage 3 decorators (`ESNext.Decorators` in tsconfig
  `lib`); never enable `experimentalDecorators` or `emitDecoratorMetadata`
- React 19 + Vite
- `react-router-dom` in declarative mode
- Tailwind CSS (v4 via `@tailwindcss/vite`)
- `@microsoft/rayfin-{core,client,data}` for the data model and typed client
- Fabric authentication (`@microsoft/rayfin-auth-provider-fabric`)
- Vitest + Testing Library for tests
- No app-owned server: the backend is the managed Rayfin/Fabric platform (DAB)

## Preferred Bootstrap Path

Scaffold with the Rayfin CLI. It generates the correct decorator tsconfig, the
Tailwind + Vite wiring, the `rayfin/` schema scaffold, `AGENTS.md`, and
`.mcp.json` for the `rayfin` MCP server.

```bash
npm create @microsoft/rayfin@latest my-app
cd my-app
npm run dev   # rayfin env → rayfin up (backend, static hosting excluded) → vite
```

Pick the template that fits — `blankapp` (Blank App), `dataapp` (Data App),
`todoapp` (Basic Todo App, full data path with per-user RLS), or
`gettingstartedauth` (Todo with auth + getting-started docs). For an
agent-driven, non-interactive bootstrap, pass flags instead of answering
prompts:

```bash
npm create @microsoft/rayfin@latest -- --list-templates   # machine-readable JSON
npm create @microsoft/rayfin@latest my-app -- \
  --template todoapp --services auth,data --auth-methods fabric
```

Do not retrofit a plain `create-vite` template — you would have to recreate the
decorator config, schema scaffold, and MCP wiring by hand.

The generated scripts divide the work like this (verify in `package.json`):

- `predev`/`prebuild`: `rayfin env --framework vite` — regenerates `.env.local`
  (see below)
- `dev`: `rayfin up --exclude-services staticHosting && vite` — deploys the
  auth/data backend to Fabric, then serves the frontend locally
- `rayfin:db`: `rayfin up db apply` — applies database schema migrations
- `build:fabric`: the build the platform's static-hosting deploy invokes
  (wired via `staticHosting.buildCommand` in `rayfin.yml`)

Before writing entities or queries, consult the bundled `rayfin` skill / MCP
`search_docs('known limitations')` for platform constraints (MCP tools:
`search_docs`, `get_doc`, `list_docs`, `discover_packages`; CLI fallback:
`npx -y @microsoft/rayfin-cli docs ...` from the project root). Entity
decorators, `@role`/RLS, `rayfin.yml`, and deployment are **owned by the
`rayfin` skill**, not this one.

## Environment Variables Are Generated

`rayfin env` emits `.env.local` at the project root from `rayfin/.env`,
exposing only `RAYFIN_PUBLIC_*` variables, renamed by dropping `PUBLIC_` and
prefixing `VITE_`: `RAYFIN_PUBLIC_<NAME>` → `VITE_RAYFIN_<NAME>` (e.g.
`RAYFIN_PUBLIC_API_URL` → `VITE_RAYFIN_API_URL`). The file carries an
"Auto-generated … do not edit" header and is rewritten on every `npm run dev`
and `npm run build` via `predev`/`prebuild`.

- Never hand-edit `.env.local`; change `rayfin/.env` (platform-owned — defer to
  the `rayfin` skill) and regenerate.
- The template reads `VITE_RAYFIN_API_URL`, `VITE_RAYFIN_PUBLISHABLE_KEY`, and
  for Fabric auth `VITE_FABRIC_WORKSPACE_ID`, `VITE_FABRIC_ITEM_ID`,
  `VITE_FABRIC_PORTAL_URL`. Validate them as `unknown` in
  `infrastructure/config/` like any other `import.meta.env` value.
- The `VITE_FABRIC_*` values cannot be produced by the `rayfin env` mapping
  (it always yields a `VITE_RAYFIN_` prefix); they are provisioned by the
  platform tooling when a Fabric workspace is connected (workspace/item flags
  at create time, `rayfin up`). When they are absent and the API URL points at
  localhost, the template runs its mock/local path instead — do not hand-author
  them.

## Platform-Managed Scaffolding — Never Hand-Edit

The CLI owns and re-syncs these files (the create flow's "Synchronizing with
latest rayfin scaffolding" step; hashes tracked in `rayfin/.lockfile.json`):

- `.agents/skills/rayfin/` — the bundled `rayfin` skill (`rayfin-managed: true`
  in its frontmatter)
- the `rayfin` server entry in `.mcp.json`
- `rayfin/.lockfile.json` itself

Hand edits are overwritten on the next sync and break the hash tracking. Put
project-specific agent guidance in `AGENTS.md` or your own skills instead.

## Grow The Layers As Needed

Do not create every directory up front. Start from the template's `src/` and
introduce the clean layers as the first real feature needs them:

```text
src/
  main.tsx                     # composition root
  App.tsx                      # declarative routes + AuthGuard
  pages/
  components/<feature>/
  usecase/<feature>/
  domain/{models,repositories,ports}/
  infrastructure/{rayfin,data,auth,config}/
```

Map the template's starter files onto the layers as described in
[`layout-and-module-placement.md`](layout-and-module-placement.md): `services/`
→ `infrastructure/`, `hooks/` → `usecase/`.

**The template's starter code is a migration starting point, not the target
architecture.** As shipped it violates this skill's patterns on purpose (it
optimizes for a small working sample): `services/rayfinClient.ts` is a
module-level mutable singleton reached through a `getRayfinClient()` service
locator, `services/todos.ts` branches on `isLocalBackend()` inside every
function instead of a Strategy chosen in a factory, and `pages/HomePage.tsx`
owns fetching, handlers, and derivation inline. When the first real feature
lands, migrate that feature fully per the staged-migration guide in
[`layout-and-module-placement.md`](layout-and-module-placement.md) rather than
copying these starter patterns into new code.

Known template lint warning: `src/hooks/AuthContext.tsx` trips
`react-refresh/only-export-components` because it exports both the provider and
the `useAuth` hook. The canonical split (`usecase/auth/AuthContext.tsx` +
`use-auth.ts`) clears it; do not suppress the rule instead.

## Wire The Composition Root First

Before layering features, establish the dependency-injection spine:

1. `infrastructure/config/` reads and validates `import.meta.env.VITE_*`
2. `infrastructure/rayfin/` builds the `RayfinClient` facade
3. `infrastructure/config/` factories assemble the auth service and
   repositories (Strategy: mock/local vs Fabric)
4. `src/main.tsx` calls the factories and injects the result through providers

This makes [`design-patterns.md`](design-patterns.md) and
[`dependency-injection-lifetime-and-side-effects.md`](dependency-injection-lifetime-and-side-effects.md)
concrete from the first screen.

## First Feature Checklist

For the first data-backed feature:

- domain model in `domain/models/`
- repository port in `domain/repositories/`
- Rayfin adapter in `infrastructure/data/` (uses `client.data.<Entity>`)
- use-case Hook in `usecase/<feature>/`
- presentational components in `components/<feature>/`
- a thin page container in `pages/` wired into `App.tsx`

## Platform And Deployment

Schema migration and deployment run through the Rayfin CLI (`rayfin up`,
`rayfin up db apply`) and are **owned by the `rayfin` skill**. Keep this skill
focused on the `src/` code architecture and hand platform work to the `rayfin`
skill and its MCP tools.
