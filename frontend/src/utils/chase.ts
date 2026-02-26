import type { Match, Innings } from '../backend';

/**
 * Compute the total runs scored in an innings
 */
export function getInningsTotalRuns(innings: Innings): number {
  return innings.balls.reduce((sum, ball) => sum + Number(ball.runs), 0);
}

/**
 * Compute the chase target for the second innings
 * Target = first innings runs + 1
 */
export function getChaseTarget(match: Match): number | null {
  if (match.innings.length < 1) return null;
  const firstInningsRuns = getInningsTotalRuns(match.innings[0]);
  return firstInningsRuns + 1;
}

/**
 * Compute remaining runs needed to win for the chasing team
 */
export function getRemainingRuns(match: Match): number | null {
  if (match.innings.length < 2) return null;
  const target = getChaseTarget(match);
  if (target === null) return null;
  
  const secondInningsRuns = getInningsTotalRuns(match.innings[1]);
  const remaining = target - secondInningsRuns;
  return remaining > 0 ? remaining : 0;
}

/**
 * Check if the chase has been achieved (second innings runs >= target)
 */
export function isChaseAchieved(match: Match): boolean {
  if (match.innings.length < 2) return false;
  const target = getChaseTarget(match);
  if (target === null) return false;
  
  const secondInningsRuns = getInningsTotalRuns(match.innings[1]);
  return secondInningsRuns >= target;
}

/**
 * Compute wickets remaining for the batting team
 * Based on squad size minus 1 (need 2 batters) minus wickets lost
 */
export function getWicketsRemaining(innings: Innings): number {
  const squadSize = innings.battingTeam.players.length;
  const wicketsLost = innings.balls.filter((b) => b.isWicket).length;
  const maxWickets = squadSize - 1; // Need at least 2 batters
  return Math.max(0, maxWickets - wicketsLost);
}

/**
 * Build a human-readable match result sentence
 * Returns null if match is not complete (less than 2 innings)
 */
export function getMatchResultSentence(match: Match): string | null {
  if (match.innings.length < 2) return null;
  
  const firstInnings = match.innings[0];
  const secondInnings = match.innings[1];
  
  const firstRuns = getInningsTotalRuns(firstInnings);
  const secondRuns = getInningsTotalRuns(secondInnings);
  
  if (secondRuns > firstRuns) {
    // Team 2 won by chasing successfully
    const wicketsRemaining = getWicketsRemaining(secondInnings);
    return `${secondInnings.battingTeam.name} won by ${wicketsRemaining} wicket${wicketsRemaining === 1 ? '' : 's'}`;
  } else if (firstRuns > secondRuns) {
    // Team 1 defended successfully
    const runMargin = firstRuns - secondRuns;
    return `${firstInnings.battingTeam.name} won by ${runMargin} run${runMargin === 1 ? '' : 's'}`;
  } else {
    // Tied
    return 'Match tied';
  }
}
