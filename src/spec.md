# Specification

## Summary
**Goal:** Add second-innings chase context (target + remaining runs), automatically end scoring when the chase is achieved, and show clear winning details on the Match Summary.

**Planned changes:**
- On Live Scoring, when the current innings is the 2nd innings in a 2-innings match, compute and display the chase target (first innings runs + 1) and remaining runs needed to win.
- During 2nd innings scoring, detect when the chasing team reaches/exceeds the target; show an English success toast naming the winning team, block/disable further ball recording, and navigate to the Match Summary screen.
- On Match Summary, display the target (when two innings exist) and an English result sentence reflecting the outcome (win by runs, win by wickets, or tie), keeping the winner heading consistent.

**User-visible outcome:** Scorers can see the target and runs needed during a chase, the app automatically declares the winner and stops scoring when the target is reached, and the Match Summary clearly shows the target and the match result with the win margin (or tie).
