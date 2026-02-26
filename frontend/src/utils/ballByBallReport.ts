import type { Ball } from '../backend';

export interface BallDisplay {
  ballNumber: number;
  batsmanName: string;
  bowlerName: string;
  outcome: string;
  runs: number;
  isWicket: boolean;
}

/**
 * Get all balls for a specific over number
 */
export function getBallsForOver(balls: Ball[], overNumber: number): Ball[] {
  let currentOver = 1;
  let legalDeliveriesInOver = 0;
  const ballsInOver: Ball[] = [];
  
  for (const ball of balls) {
    const isLegal = ball.extras ? ball.extras.legalDelivery : true;
    
    if (currentOver === overNumber) {
      ballsInOver.push(ball);
    }
    
    if (isLegal) {
      legalDeliveriesInOver++;
      
      if (legalDeliveriesInOver === 6) {
        // Over complete
        if (currentOver === overNumber) {
          break; // We've collected all balls for the requested over
        }
        currentOver++;
        legalDeliveriesInOver = 0;
      }
    }
    
    // If we've moved past the requested over, stop
    if (currentOver > overNumber) {
      break;
    }
  }
  
  return ballsInOver;
}

/**
 * Format a ball outcome for display
 */
export function formatBallOutcome(ball: Ball): string {
  if (ball.isWicket) {
    return 'W';
  }
  
  if (ball.extras) {
    const { wide, noBall, byes, legByes } = ball.extras;
    
    if (wide) {
      return `WD${ball.runs > 0n ? `+${ball.runs}` : ''}`;
    }
    
    if (noBall) {
      return `NB${ball.runs > 0n ? `+${ball.runs}` : ''}`;
    }
    
    if (byes > 0n) {
      return `${byes}B`;
    }
    
    if (legByes > 0n) {
      return `${legByes}LB`;
    }
  }
  
  // Regular runs
  const runs = Number(ball.runs);
  return runs.toString();
}

/**
 * Convert balls to display format
 */
export function formatBallsForDisplay(balls: Ball[]): BallDisplay[] {
  return balls.map((ball, index) => ({
    ballNumber: index + 1,
    batsmanName: ball.batsman.name,
    bowlerName: ball.bowler.name,
    outcome: formatBallOutcome(ball),
    runs: Number(ball.runs),
    isWicket: ball.isWicket,
  }));
}
