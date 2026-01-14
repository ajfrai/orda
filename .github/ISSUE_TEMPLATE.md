# Remove Debug Error Display Before Production

## Description
The landing page (`app/page.tsx`) currently displays detailed error information including stack traces to help with debugging. This needs to be removed or hidden behind a feature flag before going to production.

## Location
- File: `app/page.tsx`
- Lines: Error display section with red background showing debug information

## Current Behavior
When an error occurs, the UI shows:
- Full stack traces
- Request details (mode, file names, URLs)
- Response headers and data
- Console logs with `[DEBUG]` prefix

## Expected Behavior (Production)
- Show user-friendly error messages only
- Log detailed errors to server-side logging (not client-side)
- Consider adding error tracking service (Sentry, etc.)
- Remove all `[DEBUG]` console logs

## Tasks
- [ ] Remove or conditionally hide the detailed error display box
- [ ] Replace with user-friendly error messages
- [ ] Remove `[DEBUG]` console.log statements
- [ ] Add proper server-side error logging
- [ ] Consider adding error tracking service
- [ ] Test error handling in production mode

## Priority
**High** - Must be done before production launch

## Labels
- bug
- security
- production-blocker
