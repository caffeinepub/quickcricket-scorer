// Diagnostics helper for offline match creation and persistence
// Provides structured console logging and user-facing error messages

export type OfflineStep = 
  | 'save-match'
  | 'save-innings'
  | 'load-match'
  | 'record-ball'
  | 'delete-match';

export interface OfflineError {
  step: OfflineStep;
  operation: string;
  error: unknown;
  timestamp: number;
}

/**
 * Log a structured error to console for offline operations
 */
export function logOfflineError(step: OfflineStep, operation: string, error: unknown): void {
  const diagnosticEntry: OfflineError = {
    step,
    operation,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error,
    timestamp: Date.now(),
  };

  console.error('🏏 QuickCricket Offline Error:', diagnosticEntry);
}

/**
 * Get user-facing error message for a specific offline step failure
 */
export function getUserMessage(step: OfflineStep, error: unknown): string {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';

  switch (step) {
    case 'save-match':
      if (errorMessage.includes('storage is full') || errorMessage.includes('QuotaExceededError')) {
        return 'Could not save match: Device storage is full. Please free up space or delete old matches.';
      }
      if (errorMessage.includes('blocked')) {
        return 'Could not save match: Storage is blocked in your browser settings. Please enable storage for this site.';
      }
      return 'Could not save match to this device. Please check your browser storage settings.';

    case 'save-innings':
      if (errorMessage.includes('storage is full') || errorMessage.includes('QuotaExceededError')) {
        return 'Could not save innings: Device storage is full. Please free up space or delete old matches.';
      }
      if (errorMessage.includes('blocked')) {
        return 'Could not save innings: Storage is blocked in your browser settings. Please enable storage for this site.';
      }
      return 'Could not save innings to this device. Please check your browser storage settings.';

    case 'load-match':
      if (errorMessage.includes('corrupted')) {
        return 'Could not load match: The saved data may be corrupted. Try deleting and recreating the match.';
      }
      if (errorMessage.includes('not found')) {
        return 'Match not found on this device. You may need to be online to access this match.';
      }
      return 'Could not load match from this device. The saved data may be corrupted.';

    case 'record-ball':
      if (errorMessage.includes('storage is full') || errorMessage.includes('QuotaExceededError')) {
        return 'Could not save ball: Device storage is full. Please free up space.';
      }
      return 'Could not save ball to this device. Please check your browser storage settings.';

    case 'delete-match':
      return 'Could not delete match from this device. Please try again.';

    default:
      return 'An offline operation failed. Please check your browser storage settings.';
  }
}

/**
 * Log and return user message for an offline error
 */
export function handleOfflineError(step: OfflineStep, operation: string, error: unknown): string {
  logOfflineError(step, operation, error);
  return getUserMessage(step, error);
}
