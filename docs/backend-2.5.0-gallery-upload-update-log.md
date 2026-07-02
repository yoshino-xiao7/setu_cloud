# Backend 2.5.0 Gallery Upload Release Notes

## Summary

Backend 2.5.0 introduced the user gallery submission pipeline with OSS direct upload, submission status tracking, and admin review.

## Core Changes

- Added user-created gallery submission batches.
- Added OSS direct-upload initialization and completion checks.
- Added per-image upload state so interrupted uploads can be recovered or retried.
- Added admin submission review before images enter the public gallery.
- Extended public gallery records with source metadata from approved submissions.

## Frontend Impact

The frontend upload page should create a batch, upload files directly to OSS, report each item state, and call the complete endpoint only after all required uploads are complete. Admin pages should review batches and expose cleanup/publish failures.

## Current Follow-up State

Later backend work added reliability improvements, operation logs, incomplete-upload reporting, retry flows, and stronger cleanup states. Use these current integration documents for implementation details:

- `setu_api_full/docs/gallery-upload-frontend-integration.md`
- `setu_api_full/docs/gallery-upload-integration-test.md`
- `setu_api_full/docs/reliability-admin-workflow-frontend-integration.md`
