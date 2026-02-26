import { Match, TossDecision } from '../backend';

/**
 * Formats toss information into a human-readable English sentence.
 * Returns "Toss: Not recorded" if toss information is missing.
 */
export function formatTossInfo(match: Match): string {
  if (!match.toss) {
    return 'Toss: Not recorded';
  }

  const winnerTeam = match.teams.find((team) => team.id === match.toss!.winnerTeamId);
  const winnerName = winnerTeam?.name || 'Unknown Team';
  
  const decision = match.toss.decision === 'bat' ? 'bat' : 'bowl';
  
  return `Toss: ${winnerName} won and chose to ${decision}`;
}
