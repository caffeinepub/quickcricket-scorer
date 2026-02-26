/**
 * Helper to detect and normalize backend authorization failures into
 * user-friendly English messages.
 */

export interface AuthErrorResult {
  isAuthError: boolean;
  userMessage: string;
}

/**
 * Analyzes an error and returns whether it's an authorization error
 * and a user-friendly message.
 */
export function normalizeBackendAuthError(error: unknown): AuthErrorResult {
  if (!error) {
    return {
      isAuthError: false,
      userMessage: 'An unknown error occurred',
    };
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  // Check for common authorization error patterns
  if (
    lowerMessage.includes('unauthorized') ||
    lowerMessage.includes('only users can') ||
    lowerMessage.includes('only registered users') ||
    lowerMessage.includes('permission denied')
  ) {
    return {
      isAuthError: true,
      userMessage:
        'You need to be signed in to save matches online. You can create a local-only match (saved on this device) or sign in to save matches to your account.',
    };
  }

  // Not an auth error, return generic message
  return {
    isAuthError: false,
    userMessage: errorMessage || 'An error occurred',
  };
}

/**
 * Checks if an error is specifically about match creation authorization.
 */
export function isMatchCreationAuthError(error: unknown): boolean {
  if (!error) return false;
  
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();
  
  return (
    lowerMessage.includes('unauthorized') &&
    (lowerMessage.includes('create match') || lowerMessage.includes('only users can'))
  );
}
