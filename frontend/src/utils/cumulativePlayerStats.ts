import type { Match, Ball } from '../backend';

export interface CumulativePlayerStats {
  playerName: string;
  matchesPlayed: number;
  batting: {
    runs: number;
    ballsFaced: number;
    fours: number;
    sixes: number;
    outs: number;
    strikeRate: string;
    average: string;
  };
  bowling: {
    wickets: number;
    ballsBowled: number;
    runsConceded: number;
    overs: string;
    economyRate: string;
    average: string;
  };
}

function formatOvers(balls: number): string {
  const overs = Math.floor(balls / 6);
  const rem = balls % 6;
  return rem === 0 ? `${overs}` : `${overs}.${rem}`;
}

export function computeCumulativePlayerStats(
  matches: Match[],
  playerName: string
): CumulativePlayerStats {
  let totalRuns = 0;
  let totalBallsFaced = 0;
  let totalFours = 0;
  let totalSixes = 0;
  let totalOuts = 0;
  let totalWickets = 0;
  let totalBallsBowled = 0;
  let totalRunsConceded = 0;

  const matchesParticipated = new Set<string>();

  for (const match of matches) {
    let appearedInMatch = false;

    for (const innings of match.innings) {
      for (const ball of innings.balls) {
        if (ball.batsman.name === playerName) {
          appearedInMatch = true;
          const isLegal = ball.extras?.legalDelivery !== false;
          if (isLegal) totalBallsFaced += 1;
          const runs = Number(ball.runs);
          totalRuns += runs;
          if (runs === 4) totalFours += 1;
          if (runs === 6) totalSixes += 1;
          if (ball.isWicket) totalOuts += 1;
        }

        if (ball.bowler.name === playerName) {
          appearedInMatch = true;
          const isLegal = ball.extras?.legalDelivery !== false;
          if (isLegal) totalBallsBowled += 1;
          const runs = Number(ball.runs);
          const wideRun = ball.extras?.wide ? 1 : 0;
          const noBallRun = ball.extras?.noBall ? 1 : 0;
          totalRunsConceded += runs + wideRun + noBallRun;
          if (ball.isWicket) totalWickets += 1;
        }
      }
    }

    if (appearedInMatch) {
      matchesParticipated.add(match.id.toString());
    }
  }

  const matchesPlayed = matchesParticipated.size;

  const strikeRate =
    totalBallsFaced > 0
      ? ((totalRuns / totalBallsFaced) * 100).toFixed(1)
      : '0.0';

  const battingAverage =
    totalOuts > 0
      ? (totalRuns / totalOuts).toFixed(1)
      : totalRuns > 0
      ? `${totalRuns}*`
      : '0.0';

  const economyRate =
    totalBallsBowled > 0
      ? ((totalRunsConceded / totalBallsBowled) * 6).toFixed(1)
      : '0.0';

  const bowlingAverage =
    totalWickets > 0
      ? (totalRunsConceded / totalWickets).toFixed(1)
      : '-';

  return {
    playerName,
    matchesPlayed,
    batting: {
      runs: totalRuns,
      ballsFaced: totalBallsFaced,
      fours: totalFours,
      sixes: totalSixes,
      outs: totalOuts,
      strikeRate,
      average: battingAverage,
    },
    bowling: {
      wickets: totalWickets,
      ballsBowled: totalBallsBowled,
      runsConceded: totalRunsConceded,
      overs: formatOvers(totalBallsBowled),
      economyRate,
      average: bowlingAverage,
    },
  };
}
