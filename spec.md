# Specification

## Summary
**Goal:** Fix the Statistics section in QuickCricket Scorer so it loads and displays correctly.

**Planned changes:**
- Ensure the Stats route is correctly defined in App.tsx and linked from the AppHeader or dashboard
- Fix MatchStatsPage to load match data from localStorage and render batting/bowling stat tables per innings without errors
- Fix PlayerStatsPage to load cumulative player stats and render filtered tables by team/player selection
- Ensure all stat columns (runs, balls faced, strike rate, wickets, overs bowled, economy rate) display correct computed values using existing utilities
- Show an appropriate empty-state message when no match data exists in localStorage

**User-visible outcome:** Users can navigate to the Statistics section and view match and player stat tables populated with correct data, with no blank screens, crashes, or console errors.
