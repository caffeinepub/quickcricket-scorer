import type { Innings, Ball, Player } from '../backend';

export interface BattingStats {
  player: Player;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: string;
  isOut: boolean;
}

export interface BowlingStats {
  bowler: Player;
  overs: string;
  runs: number;
  wickets: number;
  economy: string;
  wides: number;
  noBalls: number;
}

/**
 * Compute batting statistics for all players in an innings
 */
export function computeBattingStats(innings: Innings): BattingStats[] {
  const statsMap = new Map<string, BattingStats>();

  // Initialize all players
  innings.battingTeam.players.forEach((player) => {
    statsMap.set(player.id.toString(), {
      player,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      strikeRate: '0.0',
      isOut: false,
    });
  });

  // Aggregate stats from balls
  innings.balls.forEach((ball: Ball) => {
    const playerId = ball.batsman.id.toString();
    const stats = statsMap.get(playerId);
    if (stats) {
      const runs = Number(ball.runs);
      stats.runs += runs;

      // Only count legal deliveries as balls faced
      const isLegalDelivery = ball.extras ? ball.extras.legalDelivery : true;
      if (isLegalDelivery) {
        stats.balls += 1;
      }

      if (runs === 4) stats.fours += 1;
      if (runs === 6) stats.sixes += 1;
      if (ball.isWicket) stats.isOut = true;
    }
  });

  // Calculate strike rates
  statsMap.forEach((stats) => {
    if (stats.balls > 0) {
      stats.strikeRate = ((stats.runs / stats.balls) * 100).toFixed(1);
    }
  });

  return Array.from(statsMap.values());
}

/**
 * Compute bowling statistics for all bowlers in an innings
 */
export function computeBowlingStats(innings: Innings): BowlingStats[] {
  const statsMap = new Map<string, BowlingStats>();

  innings.balls.forEach((ball: Ball) => {
    const bowlerId = ball.bowler.id.toString();
    
    if (!statsMap.has(bowlerId)) {
      statsMap.set(bowlerId, {
        bowler: ball.bowler,
        overs: '0.0',
        runs: 0,
        wickets: 0,
        economy: '0.0',
        wides: 0,
        noBalls: 0,
      });
    }

    const stats = statsMap.get(bowlerId)!;
    const runs = Number(ball.runs);
    
    // Add all runs to bowler's total
    stats.runs += runs;

    // Count wickets
    if (ball.isWicket) {
      stats.wickets += 1;
    }

    // Count extras
    if (ball.extras) {
      if (ball.extras.wide) stats.wides += 1;
      if (ball.extras.noBall) stats.noBalls += 1;
    }
  });

  // Calculate overs and economy for each bowler
  statsMap.forEach((stats, bowlerId) => {
    // Count legal deliveries bowled by this bowler
    const legalBalls = innings.balls.filter((ball) => {
      const isLegalDelivery = ball.extras ? ball.extras.legalDelivery : true;
      return ball.bowler.id.toString() === bowlerId && isLegalDelivery;
    }).length;

    const overs = Math.floor(legalBalls / 6);
    const balls = legalBalls % 6;
    stats.overs = `${overs}.${balls}`;

    // Economy rate: runs per over
    if (legalBalls > 0) {
      const totalOvers = legalBalls / 6;
      stats.economy = (stats.runs / totalOvers).toFixed(2);
    }
  });

  return Array.from(statsMap.values());
}
