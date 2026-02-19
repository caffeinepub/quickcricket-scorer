import type { Ball } from '../backend';

export interface BallDisplayToken {
  label: string;
  isWicket: boolean;
}

export interface LastOverViewModel {
  balls: Ball[];
  totalRuns: number;
  displayTokens: BallDisplayToken[];
}

/**
 * Compute a last-over view model from innings ball history
 * Selects the last 6 legal deliveries and includes any illegal deliveries within that span
 */
export function getLastOverViewModel(ballHistory: Ball[]): LastOverViewModel {
  if (ballHistory.length === 0) {
    return {
      balls: [],
      totalRuns: 0,
      displayTokens: [],
    };
  }

  // Find indices of legal deliveries
  const legalIndices: number[] = [];
  ballHistory.forEach((ball, index) => {
    const isLegal = ball.extras ? ball.extras.legalDelivery : true;
    if (isLegal) {
      legalIndices.push(index);
    }
  });

  // If fewer than 6 legal deliveries, start from beginning
  // Otherwise, take the last 6 legal deliveries
  const startLegalIndex = Math.max(0, legalIndices.length - 6);
  const selectedLegalIndices = legalIndices.slice(startLegalIndex);

  if (selectedLegalIndices.length === 0) {
    // No legal deliveries yet, show all balls
    const totalRuns = ballHistory.reduce((sum, b) => sum + Number(b.runs), 0);
    const tokens = ballHistory.map(formatBallToken);
    return {
      balls: [...ballHistory],
      totalRuns,
      displayTokens: tokens,
    };
  }

  // Determine the window: from first selected legal delivery to end of history
  const windowStart = selectedLegalIndices[0];
  const selectedBalls = ballHistory.slice(windowStart);

  // Calculate total runs for selected balls
  const totalRuns = selectedBalls.reduce((sum, b) => sum + Number(b.runs), 0);

  // Generate display tokens
  const displayTokens = selectedBalls.map(formatBallToken);

  return {
    balls: selectedBalls,
    totalRuns,
    displayTokens,
  };
}

/**
 * Format a single ball into a compact display token
 */
function formatBallToken(ball: Ball): BallDisplayToken {
  const runs = Number(ball.runs);

  if (ball.isWicket) {
    return { label: 'W', isWicket: true };
  }

  if (ball.extras) {
    if (ball.extras.wide) {
      return { label: runs > 1 ? `WD${runs}` : 'WD', isWicket: false };
    }
    if (ball.extras.noBall) {
      return { label: runs > 1 ? `NB${runs}` : 'NB', isWicket: false };
    }
    if (Number(ball.extras.byes) > 0) {
      return { label: `${runs}b`, isWicket: false };
    }
    if (Number(ball.extras.legByes) > 0) {
      return { label: `${runs}lb`, isWicket: false };
    }
  }

  // Regular runs
  return { label: runs.toString(), isWicket: false };
}
