# UI Guidelines for setu_cloud

These rules are for Codex and other coding agents working on the Vue frontend. They turn the existing Aurora Glassmorphism style into concrete implementation and review rules.

## Visual Direction

- Keep the product feeling like a polished app console, not a marketing landing page, unless editing the public landing route itself.
- Preserve the Aurora Glassmorphism language: luminous white surfaces, soft pink/blue environmental tint, subtle depth, high readability, and restrained motion.
- Use the brand pink `#f586a9` through existing CSS variables such as `--ui-primary`, `--lg-accent`, and related soft/glow tokens.
- Avoid one-off color palettes. For status colors, reuse `--ui-blue`, `--ui-mint`, `--ui-warning`, and `--ui-danger` where possible.
- Do not add decorative gradient blobs, ornamental cards, or unrelated illustration just to fill space.

## Design Tokens And Primitives

- Prefer primitives from `src/styles/liquid-glass.css`:
  - Page shell: `.ui-page`, `.ui-page-header`, `.ui-page-title`, `.ui-page-subtitle`
  - Surfaces: `.ui-card`, `.ui-card-hover`, `.ui-stat-card`
  - Small UI: `.ui-pill`, `.ui-icon-box`, `.ui-primary-button`
  - Layout helpers: `.ui-grid`, `.responsive-table`, `.mobile-action-bar`
- Use `.glass-card` and `.glass-table` when touching legacy sections already built around those classes. For new app screens, prefer `ui-*` classes.
- Keep CSS variables as the source of truth. Do not hard-code new pink/blue/gray values unless a component API requires a literal and nearby code already does so.
- Keep border radii consistent with tokens: `--ui-radius-sm/md/lg/xl` for app surfaces and `--lg-radius-*` for liquid-glass legacy surfaces.

## Layout Patterns

- Dashboard/user pages should use a constrained `.ui-page` container and existing `UserLayout` spacing.
- Admin pages should follow `AdminLayout` patterns and keep dense operational views scannable.
- Do not nest cards inside decorative cards. Use full sections plus individual cards, or a single card containing the actual tool/table/form.
- Use CSS grid/flex with explicit gaps rather than margins scattered across children.
- Tables or dense lists must be usable on mobile: either switch to mobile cards or wrap the table with `.responsive-table`.
- Use `.mobile-action-bar` for important bottom actions on compact screens when actions would otherwise be pushed below long content.

## Responsive Rules

- Use `useBreakpoint()` for JS responsive decisions:
  - `isMobile`: `<= 640px`
  - `isCompact`: `<= 768px`
  - `isTablet`: `641px - 1024px`
  - `isDesktop`: `> 1024px`
- Default manual QA viewports are 1440px desktop and 390px mobile.
- Mobile screens must not have horizontal page scroll. If content is intrinsically wide, constrain it inside `.responsive-table` or redesign as cards.
- Modals and drawers must fit within `92vw` or use the existing Naive UI modal constraints.
- Text in buttons, cards, tabs, and table cells must not overlap or clip. Prefer wrapping, shorter labels, or responsive layout changes over shrinking font with viewport units.

## Components And Interaction

- Use Naive UI for standard controls: buttons, forms, inputs, select, modal/dialog, drawer, table, dropdown, tabs, pagination, empty/loading feedback.
- Use `@vicons/ionicons5` for normal icons and existing `SidebarStickerIcon` assets for sidebar/product navigation motifs.
- Use `src/Message/` for success/error/info messages.
- Use `useRequestGuard()` when multiple fast requests could race and overwrite newer data.
- Use `src/utils/dateFormat.ts` for all visible date/time/duration formatting.
- Use `safePush()` for navigation initiated from component code.
- Keep click targets comfortable on mobile. Icon-only buttons need accessible labels or Naive UI tooltip/title support when the meaning is not obvious.

## State Coverage

Every data-driven page or component should intentionally cover:

- Loading: skeleton, spinner, or disabled control state consistent with nearby pages.
- Empty: clear empty copy and a useful next action when one exists.
- Error: visible recovery path using `Message.error()` or an inline error panel, depending on severity.
- Unauthorized/permission: redirect or show restricted state according to existing route guard and API behavior.
- Submitting/mutating: disable duplicate actions and show progress for destructive or long-running operations.

## Forms, Tables, And Admin Screens

- Forms should group related fields, use Naive UI validation where practical, and expose backend errors in user-readable language.
- Destructive actions need confirmation via Naive UI dialog/popconfirm and must use warning/error styling.
- Admin tables should keep filters, batch actions, pagination, and detail drawers visually predictable.
- On mobile admin pages, prefer cards with the key fields and actions rather than squeezing full desktop tables.
- For batch operations, keep selected counts and action availability visible.

## Public Pages And SEO

- Public/indexable routes should call `useSeo()` with route-specific title and description.
- Shareable pages should maintain OpenGraph/Twitter/Schema.org metadata when content changes affect previews.
- Public pages can be more expressive than dashboard screens, but the brand/product must be visible in the first viewport and the next section should be hinted below the fold.

## Verification Checklist

Before handing off a UI change, verify the touched route at 1440px and 390px:

- No horizontal page scroll or clipped modal/drawer content.
- No overlapping cards, buttons, text, tabs, or floating bars.
- Loading, empty, error, and populated states are reasonable for the changed flow.
- Mobile actions remain reachable and do not cover essential content.
- Icons come from approved sources, and unfamiliar icon-only actions have labels/tooltips.
- Typecheck and lint have been run when component logic or imports changed, or the reason they could not run is stated.
