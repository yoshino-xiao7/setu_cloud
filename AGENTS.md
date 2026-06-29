# AGENTS.md

## Project Overview

Setu Cloud is the Vue 3 frontend console for XueLiang Cloud. It includes the public landing pages, auth flows, dashboard, API key management, points, collections and public square features, Netease music player, admin console, system status, SEO metadata, and responsive Aurora Glassmorphism UI.

## Workspace Context

When this repository is opened as part of a multi-repository workspace, also read the workspace root `AGENTS.md` before frontend-backend contract, auth, API response, or product-flow changes. The workspace path can differ between macOS and Windows; rely on sibling repository names instead of absolute machine paths.

For backend-facing API changes, inspect the matching `setu_api_full` controller, service, DTO/entity/row, mapper interface, and XML mapper before final handoff.

The Windows-only `setu_ai_wife` repository may be absent on macOS. Only require it when the task explicitly touches the local AI drawing worker or ComfyUI integration.

## Stack

- Node.js >= 20.19
- npm with `package-lock.json`
- Vue 3 with `<script setup>`
- TypeScript
- Vite 7
- Naive UI
- Pinia
- Vue Router
- Axios
- ECharts / vue-echarts
- dayjs
- @vicons/ionicons5
- Playwright for e2e tests

## Common Commands

Install dependencies:

```bash
npm install
```

Start local development:

```bash
npm run dev
```

Typecheck:

```bash
npm run typecheck
```

Lint:

```bash
npm run lint
```

Full local quality check:

```bash
npm run check
```

Build production output:

```bash
npm run build
```

E2E tests:

```bash
npm run test:e2e
npm run test:e2e:desktop
npm run test:e2e:all
```

## Development Rules

- Use npm, not pnpm or yarn, because this repo tracks `package-lock.json`.
- Prefer `<script setup lang="ts">` and Composition API patterns.
- Keep API calls in `src/api/` with TypeScript request/response types. Use `unwrapApiData` from `src/api/response.ts` for response handling.
- Put external service URLs and runtime config in `src/api/env.ts`, backed by `VITE_*` variables. Do not scatter `import.meta.env` reads through components.
- Use the shared Axios/signature behavior in `src/api/http.ts`; do not create one-off HTTP clients unless there is a clear reason.
- Preserve the backend auth contract: HttpOnly `SID` cookie plus frontend-held `signSecret` for HMAC-signed protected requests.
- Use Pinia stores in `src/stores` for cross-page state such as auth and music playback. Keep page-local state inside the page/component.
- Use Vue Router route meta consistently: public pages need `meta.public: true`, admin pages need `meta.requiresAdmin: true`.
- Use `src/utils/dateFormat.ts` helpers for dates and durations. Do not add local date formatting helpers inside components.
- Use `src/Message/` for user-facing success/error/info messages.
- For rapid repeated requests, use `useRequestGuard()` to avoid stale responses overwriting fresh state.
- Do not commit generated build output under `dist/` or transient local files.

## UI And Frontend Conventions

- Read `docs/agents/ui-guidelines.md` before changing UI, layout, visual style, dashboard/admin pages, public pages, or reusable components.
- Keep the Aurora Glassmorphism visual language. Prefer the shared `ui-*` primitives in `src/styles/liquid-glass.css`; use `.glass-card` and `.glass-table` only when matching existing legacy sections.
- Use Naive UI for common controls, forms, modals, tables, drawers, dropdowns, and feedback. Keep custom CSS scoped to layout, glass treatment, and product-specific composition.
- Use `@vicons/ionicons5` or existing `SidebarStickerIcon` assets for icons. Do not introduce a new icon set.
- Match existing `UserLayout` and `AdminLayout` responsive behavior. Use `useBreakpoint()` instead of ad hoc `window.innerWidth` checks.
- Every changed page must handle loading, empty, error, and permission/unauthorized states when the data flow can reach them.
- For public pages, use `useSeo()` and update Schema.org/OpenGraph only when the route is shareable or indexable.

## UI Verification

- For UI changes, inspect the affected route at desktop and mobile widths before handoff; use 1440px and 390px as the default viewports.
- Confirm there is no horizontal page scroll, text overflow, clipped buttons, modal overflow, card overlap, or table/action crowding.
- For data-heavy views, verify both populated and empty states; for forms, verify validation, submitting, success, and failure states.
- Prefer `npm run typecheck` and `npm run lint` for logic/style changes; run `npm run build` when route, SEO, build, or dependency behavior changes.

## Agent skills

### Issue tracker

Issues and PRDs are tracked as local markdown under `.scratch/`; external PRs are not a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default mattpocock/skills triage vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repo. Skills should read root `CONTEXT.md` and `docs/adr/` when present. See `docs/agents/domain.md`.
