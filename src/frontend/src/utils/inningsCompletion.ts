import type { Ball } from '../backend';

/**
 * Count legal deliveries from ball history
 * Legal deliveries are those where extras.legalDelivery is true or extras is undefined
 */
export function countLegalDeliveries(balls: Ball[]): number {
  return balls.filter((ball) => {
    if (!ball.extras) return true; // No extras = legal delivery
    return ball.extras.legalDelivery;
  }).length;
}

/**
 * Check if innings is complete based on overs limit
 * @param balls - Ball history for the innings
 * @param oversLimit - Maximum overs for the innings (null if unlimited)
 * @returns true if innings has reached the overs limit
 */
export function isInningsCompleteByOvers(balls: Ball[], oversLimit: bigint | null | undefined): boolean {
  if (!oversLimit) return false;
  
  const legalDeliveries = countLegalDeliveries(balls);
  const maxLegalDeliveries = Number(oversLimit) * 6;
  
  return legalDeliveries >= maxLegalDeliveries;
}

/**
 * Get current overs and balls from legal deliveries
 */
export function getCurrentOvers(balls: Ball[]): { overs: number; ballsInOver: number } {
  const legalDeliveries = countLegalDeliveries(balls);
  return {
    overs: Math.floor(legalDeliveries / 6),
    ballsInOver: legalDeliveries % 6,
  };
}
