import type { Match, Innings, Team } from '../backend';

/**
 * Ensures a match has at least one innings initialized.
 * If the match has no innings, creates the first innings based on toss decision.
 * Returns the match with initialized innings.
 */
export function ensureMatchInitialized(match: Match): Match {
  // If innings already exist, return as-is
  if (match.innings && match.innings.length > 0) {
    return match;
  }

  // If no toss info, cannot initialize innings
  if (!match.toss) {
    console.warn('Cannot initialize innings: toss information missing');
    return match;
  }

  // Find the teams
  const tossWinnerTeam = match.teams.find((t) => t.id === match.toss!.winnerTeamId);
  const otherTeam = match.teams.find((t) => t.id !== match.toss!.winnerTeamId);

  if (!tossWinnerTeam || !otherTeam) {
    console.warn('Cannot initialize innings: teams not found');
    return match;
  }

  // Determine batting and bowling teams based on toss decision
  // Handle both string format ('bat'/'bowl') and enum format ({__kind__: 'bat'})
  const tossDecision = typeof match.toss.decision === 'string' 
    ? match.toss.decision 
    : (match.toss.decision as any).__kind__ || match.toss.decision;

  let battingTeam: Team;
  let bowlingTeam: Team;

  if (tossDecision === 'bat') {
    battingTeam = tossWinnerTeam;
    bowlingTeam = otherTeam;
  } else {
    battingTeam = otherTeam;
    bowlingTeam = tossWinnerTeam;
  }

  // Create the first innings with complete team rosters
  const firstInnings: Innings = {
    battingTeam: {
      id: battingTeam.id,
      name: battingTeam.name,
      players: battingTeam.players || [],
    },
    bowlingTeam: {
      id: bowlingTeam.id,
      name: bowlingTeam.name,
      players: bowlingTeam.players || [],
    },
    balls: [],
    totalRuns: 0n,
    totalWickets: 0n,
    overs: match.oversPerInnings || undefined,
    ballsInCurrentOver: 0n,
  };

  return {
    ...match,
    innings: [firstInnings],
  };
}
