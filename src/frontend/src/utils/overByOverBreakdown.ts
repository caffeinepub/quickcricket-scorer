import type { Ball } from '../backend';

export interface OverBreakdown {
  overNumber: number;
  runsScored: number;
}

/**
 * Computes over-by-over runs breakdown from ball history.
 * Only includes fully completed overs (6 legal deliveries).
 */
export function computeOverByOverBreakdown(balls: Ball[]): OverBreakdown[] {
  const breakdown: OverBreakdown[] = [];
  
  let currentOverNumber = 1;
  let legalDeliveriesInCurrentOver = 0;
  let runsInCurrentOver = 0;
  
  for (const ball of balls) {
    const isLegal = ball.extras ? ball.extras.legalDelivery : true;
    
    // Add runs to current over
    runsInCurrentOver += Number(ball.runs);
    
    if (isLegal) {
      legalDeliveriesInCurrentOver++;
      
      // Check if over is complete (6 legal deliveries)
      if (legalDeliveriesInCurrentOver === 6) {
        breakdown.push({
          overNumber: currentOverNumber,
          runsScored: runsInCurrentOver,
        });
        
        // Reset for next over
        currentOverNumber++;
        legalDeliveriesInCurrentOver = 0;
        runsInCurrentOver = 0;
      }
    }
  }
  
  return breakdown;
}
