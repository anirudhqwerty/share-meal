# Share-Meal repair and verification

2026-11-20. Work branch: `fix/full-app-audit`.

## Changes

- Made registration, pickup request, approval, rejection, closure, completion, and cancellation transactional. Donation-row locks serialize competing actions; failed child writes roll back the entire operation.
- Restricted business tables and mutation RPCs to the service role. Tightened bearer-token handling, JSON validation, coordinates, IDs, lengths, schedules, and radius preferences.
- Refined welcome, login, registration, donor Home/Post/History/detail, NGO Map/Browse/Requests/detail, shared controls, and Notifications. Removed fabricated welcome counts and meal estimates; kept actual records and existing brand assets.
- Added map radius controls, accurate circle bounds, marker selection, listing tray, browser maps, organization-location fallback, and manual registration location selection.
- Fixed stale list refresh, account-load races, infinite detail spinners, incorrect request messages, donation form reset, text contrast, touch targets, reduced-motion skeletons, and browser confirmation dialogs.
- Implemented notifications last: transactional inbox creation, listing links, pagination, read/read-all, foreground refresh, auth-safe notification taps, token rotation checks, delivery attempts, Expo tickets, and receipt processing.

## Evidence

- Backend: `npm test`, 28 passing regressions. Tests cover API validation and role gates, workflow rollback, duplicate requests, competing approvals, expiry, ownership, cancellation, notification persistence, delivery failures, and invalid-token cleanup.
- Backend: `npm audit --omit=dev`, zero vulnerabilities.
- Frontend: `npm run typecheck` and `npm run lint`, passing without warnings.
- Android, iOS, and web production exports passed together with `--platform all`. These are JavaScript/assets exports, not signed native application builds.
- Live PostGIS/API integration passed using temporary verification accounts: 5 km includes the fixture; 0.1 km excludes it; radius persistence; request; approval; pickup relation; completion; inbox creation; read/read-all; missing-token handling.
- Applied timestamp migration 001, backend storage migration, and migrations 002–005 to the configured live Supabase project. Verified seven protected tables, client mutation RPC access denied, UTC expiry, and text image URLs.
- Android Pixel 8a emulator: welcome/login validation, NGO Map/Browse/Requests/listing navigation, marker/card selection, donor Home/Post/History, Notifications, back navigation, and sign-out checked with Maestro. Donor Home/Post/History/Notifications also checked at 130% system font scale; restored to 100% afterward.
- Screenshots: `output/verification/`. One history capture intentionally records loading; numeric summaries are now hidden until data loads.
- Impeccable detector on the browser map adapter: no findings.
- Temporary verification users, credentials, and their database records were removed. No fixture-food broadcast was sent to real NGOs.

## Anti Slop delivery gate

This records evidence and limits, not a certification that every possible state or device is bug-free.

- R-02 PASS: new product copy avoids em dashes; missing dates keep the existing date utility placeholder.
- R-03 PASS for inspected Android screens: 130% text-scale navigation completed; native map circle fit and tray were visually inspected. Full tablet and iOS layout coverage remains unverified.
- R-17/R-18/R-36/R-38 PASS: fabricated welcome counts and estimated meals removed; summaries use API records; no testimonials or new claims added.
- R-23 PASS: reused existing logo, existing food imagery structure, and Ionicons; no generated visual assets or new navigation destinations.
- R-24/R-26 PASS for implemented controls: routes and handlers exist; browser confirmations now invoke their actions; saved radius and full pickup lifecycle passed live API checks. Not every native control was clicked on physical hardware.
- R-25 PASS for shared text palette: contrast against white is primary 5.62:1, secondary 5.62:1, text 17.39:1, secondary text 5.94:1, muted text 4.93:1, warning 5.91:1, error 6.51:1. Muted text on the input surface is 4.60:1. This is a token check, not a full screen-reader audit.
- R-27 PASS: lists retain loading/error/empty states; detail failures expose retry instead of an endless spinner; failed loads do not claim there are zero records.
- R-28 PASS: no FAQ added.
- R-32/R-39 PARTIAL: named native actions, larger hit targets, form labels, password controls, press/focus states, and keyboard-operable browser map markers implemented. Complete keyboard and assistive-technology testing remains unverified.
- R-33 PASS: changes are committed source edits; no external source-patching script was introduced.
- R-34 PASS within scope: retained the shipped fixed light appearance; no incomplete theme toggle added.
- R-35 PARTIAL: Android/web exports and multiple recorded Maestro click-throughs completed. iOS hardware, tablet, every error state, and real-device remote push remain unverified.
- R-37 PASS: existing identity and chosen dials documented in `DESIGN.md` before UI changes.
- R-40 PASS for changed imagery: dimensions retained; no invented performance result or third-party blocking head script added. Browser map library loads after mount.
- Purpose gate PASS: flat sections serve operational scanning; borders separate records; map tools alone use elevation; icons identify food/location/actions; status badges encode real states. Reasons recorded in `DESIGN.md`.
- Liveliness PASS for inspected screens: ENERGY 1 / RHYTHM 2 / MOTION 1, warm surfaces, orange publishing actions, green collection actions, existing food identity, one main action per task.
- Craftsmanship PARTIAL: build/type/lint and tested flows pass. Remaining release dependencies below prevent calling the whole product fully verified.

## Remaining release work

1. Deploy the task branch's API and ship/rebuild the frontend together. The configured production API is still the older deployment. In particular, the new radius-preferences endpoint and pickup relations need the new API. Database notification triggers deliberately preserve compatibility with legacy API writes until that release.
2. EAS project `@anirudhqwerty1/share-meal` is linked, and development/preview/production profiles exist. Android FCM and iOS APNs credentials still need configuration and a development/production native build. Remote push cannot be proven in Expo Go; no signed build or app-store release was started.
3. Configure a recurring notification worker for `backend/scripts/deliver-notifications.js` to recover interrupted delivery and reconcile receipts independently of user activity. Mutation requests already await their initial delivery attempt; inbox reads retry pending/failed messages.
4. The SDK 54 frontend production dependency audit reports 21 upstream findings: 17 moderate and 4 high, including `decode-uri-component`, `query-string`, `expo-router`, and `image-size`. Safe compatible updates and a patched PostCSS override were applied. A global image-size override broke Metro and was removed. No forced incompatible Expo SDK upgrade was made.
5. Verify physical Android push delivery, iOS signing/runtime, tablet layouts, complete keyboard navigation, screen readers, photo upload, and remaining permission/network transitions before release.

The laptop sleep request was cancelled. No sleep command was issued.
