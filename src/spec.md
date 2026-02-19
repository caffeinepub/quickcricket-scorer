# Specification

## Summary
**Goal:** Fix undo functionality, preserve batting state across navigation, and add comprehensive over-by-over reporting to the Live Scoring screen.

**Planned changes:**
- Add a visible and functional 'Undo last ball' button on the Live Scoring page that removes the most recently recorded ball and updates all scoreboard values
- Fix state reload behavior so striker, non-striker, and bowler selections persist when navigating away from Live Scoring and returning
- Replace the 'Last Over' summary with a comprehensive over-by-over breakdown showing runs scored in each completed over throughout the current innings

**User-visible outcome:** Users can undo the last ball scored with a single button click, navigate between Live Scoring and Match Stats without losing their batsmen selections, and view a complete over-by-over scoring progression showing runs scored in each individual over (1st, 2nd, 3rd, etc.) during the innings.
