export type ParseResult<T> =
  | { success: true; value: T }
  | { success: false; error: string };

export function parseMatchId(matchId: string | undefined): ParseResult<bigint> {
  if (!matchId) {
    return { success: false, error: 'Match ID is missing' };
  }

  try {
    const parsed = BigInt(matchId);
    if (parsed < 0n) {
      return { success: false, error: 'Match ID must be a positive number' };
    }
    return { success: true, value: parsed };
  } catch (error) {
    return { success: false, error: 'Match ID is not a valid number' };
  }
}
