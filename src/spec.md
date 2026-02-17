# Specification

## Summary
**Goal:** Restore full usability of QuickCricket Scorer on mobile browsers by fixing mobile runtime/UI failures and making core scoring flows work end-to-end on small screens.

**Planned changes:**
- Identify and fix the mobile-specific runtime/UI issue(s) causing blank screens or uncaught errors in Match Setup, Matches Dashboard, and Live Scoring.
- Ensure the core mobile flow works end-to-end: create match, start innings, record runs/extras/wicket, undo, and navigate back to the dashboard.
- Add user-facing English toast errors for failed actions (e.g., match creation, start innings, navigation) and ensure useful console error logs are emitted (no silent failures).
- Make the global layout/header mobile-safe: eliminate horizontal overflow, keep header actions accessible on narrow widths, and constrain the header banner image to mobile-appropriate sizing.
- Improve mobile usability of Match Setup and Live Scoring controls: ensure dialogs/dropdowns are usable and scrollable on small screens, inputs remain visible with the on-screen keyboard, and primary scoring actions are comfortably tappable.

**User-visible outcome:** On iOS Safari and Android Chrome phone-sized screens, the app loads reliably without a blank screen, core match setup and live scoring actions work end-to-end, layout does not overflow horizontally, and any failures show clear toast messages with corresponding console logs.
