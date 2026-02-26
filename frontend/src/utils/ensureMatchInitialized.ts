import type { Match, Innings, Team, TossDecision } from '../backend';

/**
 * Ensures a match has at least one initialized innings based on toss decision.
 * Returns the match with a properly initialized first innings if none exists.
 */
export function ensureMatchInitialized(match: Match): Match {
  // If match already has innings, return as-is
  if (match.innings && match.innings.length > 0) {
    return match;
  }

  // Validate toss information exists
  if (!match.toss) {
    console.warn('ensureMatchInitialized: Match has no toss information');
    return match;
  }

  // Validate teams exist
  if (!match.teams || match.teams.length < 2) {
    console.warn('ensureMatchInitialized: Match has insufficient teams');
    return match;
  }

  const { toss, teams, oversPerInnings } = match;

  // Find the toss winner team
  const tossWinnerTeam = teams.find((t) => t.id === toss.winnerTeamId);
  if (!tossWinnerTeam) {
    console.warn('ensureMatchInitialized: Toss winner team not found in match teams');
    return match;
  }

  // Find the other team
  const otherTeam = teams.find((t) => t.id !== toss.winnerTeamId);
  if (!otherTeam) {
    console.warn('ensureMatchInitialized: Could not find second team');
    return match;
  }

  // Determine batting and bowling teams based on toss decision
  let battingTeam: Team;
  let bowlingTeam: Team;

  // Handle both string and enum-like toss decision formats
  const decision = typeof toss.decision === 'string' 
    ? toss.decision 
    : (toss.decision as { bat?: unknown; bowl?: unknown }).bat !== undefined 
      ? 'bat' 
      : 'bowl';

  if (decision === 'bat') {
    battingTeam = tossWinnerTeam;
    bowlingTeam = otherTeam;
  } else {
    battingTeam = otherTeam;
    bowlingTeam = tossWinnerTeam;
  }

  // Validate that both teams have players
  if (!battingTeam.players || battingTeam.players.length === 0) {
    console.error('ensureMatchInitialized: Batting team has no players', battingTeam);
  }
  if (!bowlingTeam.players || bowlingTeam.players.length === 0) {
    console.error('ensureMatchInitialized: Bowling team has no players', bowlingTeam);
  }

  // Create the first innings with complete team data including player rosters
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
    overs: oversPerInnings,
    ballsInCurrentOver: 0n,
    currentStriker: undefined,
    currentNonStriker: undefined,
    currentBowler: undefined,
  };

  console.log('ensureMatchInitialized: Created first innings', {
    battingTeamPlayers: firstInnings.battingTeam.players.length,
    bowlingTeamPlayers: firstInnings.bowlingTeam.players.length,
  });

  return {
    ...match,
    innings: [firstInnings],
  };
}
