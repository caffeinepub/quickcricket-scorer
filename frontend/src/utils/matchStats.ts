import type { Innings, Ball } from '../backend';

export interface BattingStatRow {
  playerName: string;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  strikeRate: string;
}

export interface BowlingStatRow {
  playerName: string;
  overs: string;
  runsConceded: number;
  wickets: number;
  economyRate: string;
}

function formatOvers(legalBalls: number): string {
  const completedOvers = Math.floor(legalBalls / 6);
  const rem = legalBalls % 6;
  return rem === 0 ? `${completedOvers}` : `${completedOvers}.${rem}`;
}

export function computeBattingStats(innings: Innings): BattingStatRow[] {
  const statsMap = new Map<
    string,
    { runs: number; ballsFaced: number; fours: number; sixes: number; isOut: boolean }
  >();

  for (const ball of innings.balls) {
    const name = ball.batsman.name;
    if (!statsMap.has(name)) {
      statsMap.set(name, { runs: 0, ballsFaced: 0, fours: 0, sixes: 0, isOut: false });
    }
    const s = statsMap.get(name)!;
    const isLegal = ball.extras?.legalDelivery !== false;
    if (isLegal) s.ballsFaced += 1;
    const runs = Number(ball.runs);
    s.runs += runs;
    if (runs === 4) s.fours += 1;
    if (runs === 6) s.sixes += 1;
    if (ball.isWicket) s.isOut = true;
  }

  return Array.from(statsMap.entries()).map(([playerName, s]) => ({
    playerName,
    runs: s.runs,
    ballsFaced: s.ballsFaced,
    fours: s.fours,
    sixes: s.sixes,
    isOut: s.isOut,
    strikeRate:
      s.ballsFaced > 0 ? ((s.runs / s.ballsFaced) * 100).toFixed(1) : '0.0',
  }));
}

export function computeBowlingStats(innings: Innings): BowlingStatRow[] {
  const statsMap = new Map<
    string,
    { legalBalls: number; runsConceded: number; wickets: number }
  >();

  for (const ball of innings.balls) {
    const name = ball.bowler.name;
    if (!statsMap.has(name)) {
      statsMap.set(name, { legalBalls: 0, runsConceded: 0, wickets: 0 });
    }
    const s = statsMap.get(name)!;
    const isLegal = ball.extras?.legalDelivery !== false;
    if (isLegal) s.legalBalls += 1;
    // Runs conceded = ball runs + wides + no-balls (byes/leg-byes charged to batting side)
    const runs = Number(ball.runs);
    const wideRun = ball.extras?.wide ? 1 : 0;
    const noBallRun = ball.extras?.noBall ? 1 : 0;
    s.runsConceded += runs + wideRun + noBallRun;
    if (ball.isWicket) s.wickets += 1;
  }

  return Array.from(statsMap.entries()).map(([playerName, s]) => ({
    playerName,
    overs: formatOvers(s.legalBalls),
    runsConceded: s.runsConceded,
    wickets: s.wickets,
    economyRate:
      s.legalBalls > 0 ? ((s.runsConceded / s.legalBalls) * 6).toFixed(1) : '0.0',
  }));
}
