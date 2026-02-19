import type { Match, Innings, Ball } from '../backend';
import { serializeMatch, deserializeMatch } from './serialization';
import { isInningsCompleteByOvers } from '../utils/inningsCompletion';

const STORAGE_KEY_PREFIX = 'cricket_match_';

export function saveLocalMatch(match: Match, localOnly = false): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${match.id}`;
    const serialized = serializeMatch(match, localOnly);
    localStorage.setItem(key, serialized);
  } catch (error) {
    console.error('Failed to save match locally:', error);
    throw new Error('Failed to save match to device storage');
  }
}

export function loadLocalMatch(matchId: bigint): (Match & { _localOnly?: boolean }) | null {
  try {
    const key = `${STORAGE_KEY_PREFIX}${matchId}`;
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    return deserializeMatch(stored);
  } catch (error) {
    console.error('Failed to load match locally:', error);
    return null;
  }
}

export function loadAllLocalMatches(): Match[] {
  const matches: Match[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        const stored = localStorage.getItem(key);
        if (stored) {
          const match = deserializeMatch(stored);
          matches.push(match);
        }
      }
    }
  } catch (error) {
    console.error('Failed to load all local matches:', error);
  }
  return matches;
}

export function deleteLocalMatch(matchId: bigint): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${matchId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to delete match locally:', error);
    throw new Error('Failed to delete match from device storage');
  }
}

export function recordBallLocally(
  matchId: bigint,
  inningsIndex: number,
  ball: Ball
): Match | null {
  const match = loadLocalMatch(matchId);
  if (!match) {
    throw new Error('Match not found in local storage');
  }

  if (inningsIndex < 0 || inningsIndex >= match.innings.length) {
    throw new Error('Invalid innings index');
  }

  const innings = match.innings[inningsIndex];
  
  // Check if innings is already complete
  if (isInningsCompleteByOvers(innings.balls, innings.overs)) {
    throw new Error('Cannot record ball: innings is already complete');
  }

  const updatedBalls = [...innings.balls, ball];
  const updatedInnings: Innings = {
    ...innings,
    balls: updatedBalls,
    totalRuns: BigInt(updatedBalls.reduce((sum, b) => sum + Number(b.runs), 0)),
    totalWickets: BigInt(updatedBalls.filter(b => b.isWicket).length),
  };

  const updatedMatch: Match = {
    ...match,
    innings: match.innings.map((inn, idx) =>
      idx === inningsIndex ? updatedInnings : inn
    ),
  };

  saveLocalMatch(updatedMatch, match._localOnly);
  return updatedMatch;
}

export function undoLastBall(matchId: bigint): Match | null {
  const match = loadLocalMatch(matchId);
  if (!match) {
    throw new Error('Match not found in local storage');
  }

  if (match.innings.length === 0) {
    return null;
  }

  const currentInningsIndex = match.innings.length - 1;
  const innings = match.innings[currentInningsIndex];

  if (innings.balls.length === 0) {
    return null; // No balls to undo
  }

  const updatedBalls = innings.balls.slice(0, -1);
  const updatedInnings: Innings = {
    ...innings,
    balls: updatedBalls,
    totalRuns: BigInt(updatedBalls.reduce((sum, b) => sum + Number(b.runs), 0)),
    totalWickets: BigInt(updatedBalls.filter(b => b.isWicket).length),
  };

  const updatedMatch: Match = {
    ...match,
    innings: match.innings.map((inn, idx) =>
      idx === currentInningsIndex ? updatedInnings : inn
    ),
  };

  saveLocalMatch(updatedMatch, match._localOnly);
  return updatedMatch;
}

export function checkLocalMatchIntegrity(): {
  totalMatches: number;
  loadableMatches: number;
  corruptedMatches: string[];
} {
  const result = {
    totalMatches: 0,
    loadableMatches: 0,
    corruptedMatches: [] as string[],
  };

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        result.totalMatches += 1;
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            deserializeMatch(stored);
            result.loadableMatches += 1;
          } else {
            result.corruptedMatches.push(key);
          }
        } catch (error) {
          result.corruptedMatches.push(key);
        }
      }
    }
  } catch (error) {
    console.error('Failed to check local match integrity:', error);
  }

  return result;
}
