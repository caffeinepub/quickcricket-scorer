import type { Ball, Player } from '../backend';

/**
 * Get IDs of batters who are already out in the current innings
 */
export function getOutBatterIds(ballHistory: Ball[]): Set<bigint> {
  const outIds = new Set<bigint>();
  for (const ball of ballHistory) {
    if (ball.isWicket) {
      outIds.add(ball.batsman.id);
    }
  }
  return outIds;
}

/**
 * Get eligible batters for striker/non-striker selection
 * Excludes batters who are already out and optionally the current other batter
 */
export function getEligibleBatters(
  allBatters: Player[],
  ballHistory: Ball[],
  excludePlayerId?: bigint
): Player[] {
  const outIds = getOutBatterIds(ballHistory);
  return allBatters.filter((p) => {
    if (outIds.has(p.id)) return false;
    if (excludePlayerId !== undefined && p.id === excludePlayerId) return false;
    return true;
  });
}

/**
 * Get eligible batters for next-batter selection after a wicket
 * Excludes the current non-striker and all batters who are out
 */
export function getEligibleNextBatters(
  allBatters: Player[],
  ballHistory: Ball[],
  currentNonStrikerId: bigint
): Player[] {
  return getEligibleBatters(allBatters, ballHistory, currentNonStrikerId);
}
