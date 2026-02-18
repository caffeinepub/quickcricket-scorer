// On-device match store for offline-first functionality
// Uses localStorage for persistence across sessions with improved error handling

import { serializeMatch, deserializeMatch } from './serialization';
import { handleOfflineError } from './offlineDiagnostics';
import { isInningsCompleteByOvers, countLegalDeliveries } from '../utils/inningsCompletion';
import type { Match, Innings, Ball } from '../backend';

const STORAGE_KEY_PREFIX = 'cricket_match_';
const MATCH_LIST_KEY = 'cricket_matches_list';

export interface LocalMatch extends Match {
  _localOnly?: boolean;
}

export class LocalStorageError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'LocalStorageError';
  }
}

// Generate a local match ID
export function generateLocalMatchId(): bigint {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return BigInt(`${timestamp}${random}`);
}

// Save a match to local storage
export function saveLocalMatch(match: Match, localOnly = false): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${match.id.toString()}`;
    const serialized = serializeMatch(match, localOnly);
    localStorage.setItem(key, serialized);

    // Update match list
    const matchList = getLocalMatchList();
    if (!matchList.includes(match.id.toString())) {
      matchList.push(match.id.toString());
      localStorage.setItem(MATCH_LIST_KEY, JSON.stringify(matchList));
    }
  } catch (error: any) {
    const userMessage = handleOfflineError('save-match', `saveLocalMatch(${match.id})`, error);
    throw new LocalStorageError(userMessage, error);
  }
}

// Load a match from local storage
export function loadLocalMatch(matchId: bigint): LocalMatch | null {
  try {
    const key = `${STORAGE_KEY_PREFIX}${matchId.toString()}`;
    const serialized = localStorage.getItem(key);
    if (!serialized) return null;

    try {
      return deserializeMatch(serialized);
    } catch (parseError) {
      const userMessage = handleOfflineError('load-match', `loadLocalMatch(${matchId}) - parse`, parseError);
      throw new LocalStorageError(userMessage, parseError);
    }
  } catch (error) {
    if (error instanceof LocalStorageError) throw error;
    const userMessage = handleOfflineError('load-match', `loadLocalMatch(${matchId})`, error);
    throw new LocalStorageError(userMessage, error);
  }
}

// List all local match IDs
export function getLocalMatchList(): string[] {
  try {
    const list = localStorage.getItem(MATCH_LIST_KEY);
    if (!list) return [];

    try {
      const parsed = JSON.parse(list);
      return Array.isArray(parsed) ? parsed : [];
    } catch (parseError) {
      console.error('Failed to parse match list:', parseError);
      throw new LocalStorageError(
        'The saved match list may be corrupted. Try clearing browser data for this site.',
        parseError
      );
    }
  } catch (error) {
    if (error instanceof LocalStorageError) throw error;
    console.error('Failed to load match list:', error);
    throw new LocalStorageError('Failed to access device storage. Storage may be blocked.', error);
  }
}

// Load all local matches with diagnostic info
export function loadAllLocalMatches(): LocalMatch[] {
  const matchIds = getLocalMatchList();
  const matches: LocalMatch[] = [];
  const errors: string[] = [];

  for (const id of matchIds) {
    try {
      const match = loadLocalMatch(BigInt(id));
      if (match) matches.push(match);
    } catch (error) {
      console.error(`Failed to load match ${id}:`, error);
      errors.push(id);
    }
  }

  if (errors.length > 0 && matches.length === 0) {
    throw new LocalStorageError(
      `All saved matches (${errors.length}) could not be loaded. The saved data may be corrupted.`
    );
  }

  return matches;
}

// Check integrity of local storage and return diagnostic info
export function checkLocalMatchIntegrity(): {
  totalMatches: number;
  loadableMatches: number;
  corruptedMatches: string[];
} {
  const matchIds = getLocalMatchList();
  const corruptedMatches: string[] = [];
  let loadableMatches = 0;

  for (const id of matchIds) {
    try {
      const match = loadLocalMatch(BigInt(id));
      if (match) loadableMatches++;
    } catch (error) {
      console.error(`Corrupted match ${id}:`, error);
      corruptedMatches.push(id);
    }
  }

  return {
    totalMatches: matchIds.length,
    loadableMatches,
    corruptedMatches,
  };
}

// Delete a local match
export function deleteLocalMatch(matchId: bigint): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${matchId.toString()}`;
    localStorage.removeItem(key);

    // Update match list
    const matchList = getLocalMatchList();
    const updated = matchList.filter((id) => id !== matchId.toString());
    localStorage.setItem(MATCH_LIST_KEY, JSON.stringify(updated));
  } catch (error) {
    const userMessage = handleOfflineError('delete-match', `deleteLocalMatch(${matchId})`, error);
    throw new LocalStorageError(userMessage, error);
  }
}

// Update match with new innings
export function updateLocalMatchInnings(matchId: bigint, innings: Innings[]): void {
  const match = loadLocalMatch(matchId);
  if (!match) {
    throw new LocalStorageError(`Match not found in device storage`);
  }

  const updated: Match = {
    ...match,
    innings,
  };

  saveLocalMatch(updated, match._localOnly);
}

// Add a ball to the current innings
export function addBallToLocalMatch(matchId: bigint, inningsIndex: number, ball: Ball): void {
  const match = loadLocalMatch(matchId);
  if (!match) {
    throw new LocalStorageError(`Match not found in device storage`);
  }
  if (inningsIndex >= match.innings.length) {
    throw new LocalStorageError(`Invalid innings index for this match`);
  }

  const innings = [...match.innings];
  const currentInnings = innings[inningsIndex];

  // Check if innings is already complete due to overs limit
  if (isInningsCompleteByOvers(currentInnings.balls, currentInnings.overs)) {
    throw new LocalStorageError('Cannot add ball: innings is already complete (overs limit reached)');
  }

  // Determine if the delivery is legal
  const isLegalDelivery = ball.extras ? ball.extras.legalDelivery : true;

  // Update ballsInCurrentOver based on legality
  let ballsInCurrentOver = Number(currentInnings.ballsInCurrentOver);
  if (isLegalDelivery) {
    ballsInCurrentOver = (ballsInCurrentOver + 1) % 6;
  }

  const updatedInnings: Innings = {
    ...currentInnings,
    balls: [...currentInnings.balls, ball],
    totalRuns: currentInnings.totalRuns + ball.runs,
    totalWickets: ball.isWicket ? currentInnings.totalWickets + BigInt(1) : currentInnings.totalWickets,
    ballsInCurrentOver: BigInt(ballsInCurrentOver),
  };

  innings[inningsIndex] = updatedInnings;

  const updated: Match = {
    ...match,
    innings,
  };

  saveLocalMatch(updated, match._localOnly);
}

// Clear all local matches (for testing or reset)
export function clearAllLocalMatches(): void {
  const matchIds = getLocalMatchList();
  matchIds.forEach((id) => {
    const key = `${STORAGE_KEY_PREFIX}${id}`;
    localStorage.removeItem(key);
  });
  localStorage.removeItem(MATCH_LIST_KEY);
}
