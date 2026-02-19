import type { Match, Ball, BattingStats as BackendBattingStats, BowlingStats as BackendBowlingStats } from '../backend';

export interface CumulativePlayerStats {
  playerName: string;
  batting: {
    runs: number;
    ballsFaced: number;
    fours: number;
    sixes: number;
    outs: number;
  };
  bowling: {
    ballsBowled: number;
    runsConceded: number;
    wickets: number;
    wides: number;
    noBalls: number;
  };
  matchesPlayed: number;
}

/**
 * Derive cumulative player stats from locally stored matches
 */
export function computeCumulativePlayerStats(matches: Match[]): Map<string, CumulativePlayerStats> {
  const statsMap = new Map<string, CumulativePlayerStats>();

  matches.forEach(match => {
    match.innings.forEach(innings => {
      // Track which players participated in this match
      const matchPlayers = new Set<string>();

      // Process batting stats
      innings.balls.forEach((ball: Ball) => {
        const batterName = ball.batsman.name;
        matchPlayers.add(batterName);

        if (!statsMap.has(batterName)) {
          statsMap.set(batterName, createEmptyStats(batterName));
        }

        const stats = statsMap.get(batterName)!;
        const runs = Number(ball.runs);
        
        stats.batting.runs += runs;

        // Count legal deliveries only
        const isLegal = ball.extras ? ball.extras.legalDelivery : true;
        if (isLegal) {
          stats.batting.ballsFaced += 1;
        }

        if (runs === 4) stats.batting.fours += 1;
        if (runs === 6) stats.batting.sixes += 1;
        if (ball.isWicket) stats.batting.outs += 1;
      });

      // Process bowling stats
      innings.balls.forEach((ball: Ball) => {
        const bowlerName = ball.bowler.name;
        matchPlayers.add(bowlerName);

        if (!statsMap.has(bowlerName)) {
          statsMap.set(bowlerName, createEmptyStats(bowlerName));
        }

        const stats = statsMap.get(bowlerName)!;
        const runs = Number(ball.runs);

        stats.bowling.runsConceded += runs;

        if (ball.isWicket) {
          stats.bowling.wickets += 1;
        }

        // Count legal deliveries bowled
        const isLegal = ball.extras ? ball.extras.legalDelivery : true;
        if (isLegal) {
          stats.bowling.ballsBowled += 1;
        }

        // Count extras
        if (ball.extras) {
          if (ball.extras.wide) stats.bowling.wides += 1;
          if (ball.extras.noBall) stats.bowling.noBalls += 1;
        }
      });

      // Increment match count for all players who participated
      matchPlayers.forEach(playerName => {
        const stats = statsMap.get(playerName);
        if (stats) {
          stats.matchesPlayed += 1;
        }
      });
    });
  });

  return statsMap;
}

function createEmptyStats(playerName: string): CumulativePlayerStats {
  return {
    playerName,
    batting: {
      runs: 0,
      ballsFaced: 0,
      fours: 0,
      sixes: 0,
      outs: 0,
    },
    bowling: {
      ballsBowled: 0,
      runsConceded: 0,
      wickets: 0,
      wides: 0,
      noBalls: 0,
    },
    matchesPlayed: 0,
  };
}

/**
 * Convert cumulative stats to backend format for syncing
 */
export function toBackendBattingStats(stats: CumulativePlayerStats['batting']): BackendBattingStats {
  return {
    runs: BigInt(stats.runs),
    ballsFaced: BigInt(stats.ballsFaced),
    fours: BigInt(stats.fours),
    sixes: BigInt(stats.sixes),
    outs: BigInt(stats.outs),
  };
}

export function toBackendBowlingStats(stats: CumulativePlayerStats['bowling']): BackendBowlingStats {
  return {
    ballsBowled: BigInt(stats.ballsBowled),
    runsConceded: BigInt(stats.runsConceded),
    wickets: BigInt(stats.wickets),
    maidens: BigInt(0), // Not tracked in current implementation
  };
}
