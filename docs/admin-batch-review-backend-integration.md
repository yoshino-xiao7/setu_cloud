# Admin Batch Review Backend Integration

This document describes the admin batch-review integration surface used by the console.

## General Requirements

- Admin endpoints require the existing admin login session.
- Responses should use the standard API envelope and include trace/error information from the backend exception handler when an operation fails.
- Batch operations should return item-level results whenever partial success is possible.
- Frontend pages should keep failed items visible and refresh the list after successful operations.

## Image Delete Request Review

Use the image delete request admin APIs for normal gallery images and the AI delete request APIs for AI generations.

AI generation delete requests are handled through:

- `GET /admin/ai/delete-requests`
- `GET /admin/ai/delete-requests/{id}`
- `POST /admin/ai/delete-requests/{id}/approve`
- `POST /admin/ai/delete-requests/{id}/reject`

Approval hides/deletes the AI generation record and cleans cloud storage. Local archive deletion is separate and is requested through `/admin/ai/generations/{id}/local-image/delete`.

## Gallery Submission Review

Gallery submission review continues to use the gallery upload review workflow in the backend. The frontend should preserve the batch status model from `src/api/galleryUpload.ts` and the admin review views.

Expected review outcomes:

- Approved images are published into the public gallery index.
- Rejected images stay auditable and should trigger storage cleanup where applicable.
- Failed cleanup or publishing should be visible to admins for retry.

## Error Handling

The frontend should display backend messages directly when they are actionable. For validation failures, keep the row or modal open so the admin can correct the request.

## Verification

```bash
cd setu_cloud
npm run typecheck
npm run build
```
