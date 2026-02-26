import type { Match, Ball, Innings, Player } from '../backend';
import { serializeMatch, deserializeMatch } from './serialization';

const MATCHES_KEY = 'cricket_matches';
const NEXT_LOCAL_ID_KEY = 'cricket_next_local_id';

export const localMatchStore = {
  saveMatch(match: Match): void {
    try {
      // Validate innings team rosters before saving
      if (match.innings && match.innings.length > 0) {
        for (const innings of match.innings) {
          if (!innings.battingTeam?.players || innings.battingTeam.players.length === 0) {
            console.warn('localMatchStore.saveMatch: Batting team has no players', innings);
          }
          if (!innings.bowlingTeam?.players || innings.bowlingTeam.players.length === 0) {
            console.warn('localMatchStore.saveMatch: Bowling team has no players', innings);
          }
        }
      }

      const matches = this.loadAllMatches();
      const existingIndex = matches.findIndex((m) => m.id === match.id);

      if (existingIndex >= 0) {
        matches[existingIndex] = match;
      } else {
        matches.push(match);
      }

      const serialized = matches.map((m) => serializeMatch(m, false));
      localStorage.setItem(MATCHES_KEY, JSON.stringify(serialized));
    } catch (error) {
      console.error('Failed to save match to local storage:', error);
      throw new Error('Failed to save match locally');
    }
  },

  loadMatch(matchId: bigint): Match | null {
    try {
      const matches = this.loadAllMatches();
      return matches.find((m) => m.id === matchId) || null;
    } catch (error) {
      console.error('Failed to load match from local storage:', error);
      return null;
    }
  },

  loadAllMatches(): Match[] {
    try {
      const stored = localStorage.getItem(MATCHES_KEY);
      if (!stored) return [];

      const parsed = JSON.parse(stored);
      return parsed.map((item: unknown) => deserializeMatch(JSON.stringify(item)));
    } catch (error) {
      console.error('Failed to load matches from local storage:', error);
      return [];
    }
  },

  deleteMatch(matchId: bigint): void {
    try {
      const matches = this.loadAllMatches();
      const filtered = matches.filter((m) => m.id !== matchId);
      const serialized = filtered.map((m) => serializeMatch(m, false));
      localStorage.setItem(MATCHES_KEY, JSON.stringify(serialized));
    } catch (error) {
      console.error('Failed to delete match from local storage:', error);
      throw new Error('Failed to delete match locally');
    }
  },

  generateLocalMatchId(): bigint {
    try {
      const stored = localStorage.getItem(NEXT_LOCAL_ID_KEY);
      const nextId = stored ? BigInt(stored) : 1000000n;
      localStorage.setItem(NEXT_LOCAL_ID_KEY, (nextId + 1n).toString());
      return nextId;
    } catch (error) {
      console.error('Failed to generate local match ID:', error);
      return BigInt(Date.now());
    }
  },

  recordBall(
    matchId: bigint,
    ballData: {
      batsman: Player;
      bowler: Player;
      runs: bigint;
      isWicket: boolean;
      extras: {
        wide: boolean;
        noBall: boolean;
        byes: bigint;
        legByes: bigint;
        legalDelivery: boolean;
      };
      previousStrikerState?: {
        player: Player;
        runs: bigint;
        ballsFaced: bigint;
        fours: bigint;
        sixes: bigint;
        isStriker: boolean;
      };
      previousNonStrikerState?: {
        player: Player;
        runs: bigint;
        ballsFaced: bigint;
        fours: bigint;
        sixes: bigint;
        isStriker: boolean;
      };
    }
  ): boolean {
    try {
      const match = this.loadMatch(matchId);
      if (!match || match.innings.length === 0) {
        console.error('Match or innings not found');
        return false;
      }

      const currentInnings = match.innings[match.innings.length - 1];

      const oversLimit = currentInnings.overs ? Number(currentInnings.overs) : null;
      const legalDeliveriesCount = currentInnings.balls.filter(
        (b) => b.extras?.legalDelivery !== false
      ).length;

      if (oversLimit !== null && legalDeliveriesCount >= oversLimit * 6) {
        console.error('Innings is complete (overs limit reached)');
        return false;
      }

      const maxWickets = currentInnings.battingTeam.players.length - 1;
      if (Number(currentInnings.totalWickets) >= maxWickets) {
        console.error('Innings is complete (all out)');
        return false;
      }

      const ballNumber = BigInt(currentInnings.balls.length + 1);
      const newBall: Ball = {
        ballNumber,
        batsman: ballData.batsman,
        bowler: ballData.bowler,
        runs: ballData.runs,
        isWicket: ballData.isWicket,
        extras: ballData.extras,
        previousStrikerState: ballData.previousStrikerState,
        previousNonStrikerState: ballData.previousNonStrikerState,
      };

      const updatedBalls = [...currentInnings.balls, newBall];
      const totalRuns = currentInnings.totalRuns + ballData.runs;
      const totalWickets = ballData.isWicket
        ? currentInnings.totalWickets + 1n
        : currentInnings.totalWickets;

      const isLegalDelivery = ballData.extras.legalDelivery;
      const ballsInCurrentOver = isLegalDelivery
        ? (currentInnings.ballsInCurrentOver + 1n) % 6n
        : currentInnings.ballsInCurrentOver;

      const updatedInnings: Innings = {
        ...currentInnings,
        balls: updatedBalls,
        totalRuns,
        totalWickets,
        ballsInCurrentOver,
        currentStriker: ballData.batsman,
        currentNonStriker: currentInnings.currentNonStriker,
        currentBowler: ballData.bowler,
      };

      const updatedMatch: Match = {
        ...match,
        innings: [...match.innings.slice(0, -1), updatedInnings],
      };

      this.saveMatch(updatedMatch);
      return true;
    } catch (error) {
      console.error('Failed to record ball:', error);
      return false;
    }
  },

  undoLastBall(matchId: bigint): boolean {
    try {
      const match = this.loadMatch(matchId);
      if (!match || match.innings.length === 0) {
        console.error('Match or innings not found');
        return false;
      }

      const currentInnings = match.innings[match.innings.length - 1];
      if (currentInnings.balls.length === 0) {
        console.error('No balls to undo');
        return false;
      }

      const lastBall = currentInnings.balls[currentInnings.balls.length - 1];
      const updatedBalls = currentInnings.balls.slice(0, -1);

      const totalRuns = currentInnings.totalRuns - lastBall.runs;
      const totalWickets = lastBall.isWicket
        ? currentInnings.totalWickets - 1n
        : currentInnings.totalWickets;

      const isLegalDelivery = lastBall.extras?.legalDelivery !== false;
      const ballsInCurrentOver = isLegalDelivery
        ? currentInnings.ballsInCurrentOver === 0n
          ? 5n
          : currentInnings.ballsInCurrentOver - 1n
        : currentInnings.ballsInCurrentOver;

      let restoredStriker = currentInnings.currentStriker;
      let restoredNonStriker = currentInnings.currentNonStriker;

      if (lastBall.previousStrikerState) {
        restoredStriker = lastBall.previousStrikerState.player;
      }
      if (lastBall.previousNonStrikerState) {
        restoredNonStriker = lastBall.previousNonStrikerState.player;
      }

      const updatedInnings: Innings = {
        ...currentInnings,
        balls: updatedBalls,
        totalRuns,
        totalWickets,
        ballsInCurrentOver,
        currentStriker: restoredStriker,
        currentNonStriker: restoredNonStriker,
      };

      const updatedMatch: Match = {
        ...match,
        innings: [...match.innings.slice(0, -1), updatedInnings],
      };

      this.saveMatch(updatedMatch);
      return true;
    } catch (error) {
      console.error('Failed to undo last ball:', error);
      return false;
    }
  },

  checkLocalMatchIntegrity(): {
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
      const stored = localStorage.getItem(MATCHES_KEY);
      if (!stored) return result;

      const parsed = JSON.parse(stored);
      result.totalMatches = parsed.length;

      for (const serializedMatch of parsed) {
        try {
          deserializeMatch(JSON.stringify(serializedMatch));
          result.loadableMatches += 1;
        } catch (error) {
          result.corruptedMatches.push(serializedMatch.id || 'unknown');
        }
      }
    } catch (error) {
      console.error('Failed to check local match integrity:', error);
    }

    return result;
  },
};

// Bound exports so they work correctly as standalone functions (no lost `this` context)
export const loadLocalMatch = localMatchStore.loadMatch.bind(localMatchStore);
export const saveLocalMatch = localMatchStore.saveMatch.bind(localMatchStore);
export const loadAllLocalMatches = localMatchStore.loadAllMatches.bind(localMatchStore);
export const deleteLocalMatch = localMatchStore.deleteMatch.bind(localMatchStore);
export const recordBallLocally = localMatchStore.recordBall.bind(localMatchStore);
export const undoLastBall = localMatchStore.undoLastBall.bind(localMatchStore);
export const checkLocalMatchIntegrity = localMatchStore.checkLocalMatchIntegrity.bind(localMatchStore);
