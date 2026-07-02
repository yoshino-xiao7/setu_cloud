# AI Generation Frontend Pages

This document reflects the current `setu_cloud` AI drawing UI.

## User Routes

- `/dashboard/ai-draw`: creates AI generation jobs, translates prompts, shows service status, and tracks the active job.
- `/dashboard/ai-assets`: selects checkpoints, LoRA assets, characters, and prompt presets before returning to the drawing draft.
- `/dashboard/ai-history`: lists the current user's jobs, supports status filtering, detail preview, image download, review submission, inpaint/repair entry points, and delete requests.
- `/dashboard/ai-square`: lists public AI images that passed review. The default category is general content.

The user menu is wired in `src/layouts/UserLayout.vue`; routes are registered in `src/router/index.ts`.

## Admin Routes

- `/admin/ai-generations`: searches AI jobs by job ID, user ID, generation status, review status, delete status, and record state. Admins can unpublish, directly delete, or request local-image deletion.
- `/admin/ai-workers`: displays worker nodes reported by `/ai/capabilities`.
- `/admin/ai-reviews`: reviews public-square submissions and approves or rejects them.
- `/admin/ai-delete-requests`: reviews user delete requests.

The admin menu is wired in `src/layouts/AdminLayout.vue`.

## API Client

`src/api/aiGeneration.ts` is the frontend contract source. It currently covers:

- User session endpoints: `/ai/generations`, `/ai/prompt/translate`, `/ai/delete-requests`, `/ai/capabilities`, `/ai/status`, and `/ai/square`.
- API-key endpoints: `/ai-api/generations` and `/ai-api/prompt/translate`.
- Admin endpoints: `/admin/ai/generations`, `/admin/ai/reviews`, `/admin/ai/delete-requests`, and local-image deletion.

## Current Generation Features

`AiDraw.vue` supports single-character and dual-character generation, NSFW visibility settings, LoRA strength controls, dimensions, steps, CFG, seed, checkpoint selection, prompt translation, service availability, queue estimates, and active-job polling.

Generated images are private by default. A user must submit a completed image for review before it can appear in the AI Square.

## Verification

```bash
cd setu_cloud
npm run lint
npm run typecheck
npm run build
```
