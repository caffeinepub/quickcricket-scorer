// Hook to warn users before leaving a page with unsynced offline changes

import { useEffect } from 'react';

export function useUnsavedOfflineChangesGuard(hasUnsavedChanges: boolean, isOffline: boolean) {
  useEffect(() => {
    if (!hasUnsavedChanges || !isOffline) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, isOffline]);

  // Return a function to confirm navigation
  const confirmNavigation = (message?: string): boolean => {
    if (!hasUnsavedChanges || !isOffline) return true;
    return window.confirm(
      message || 'You have unsynced offline changes. Are you sure you want to leave?'
    );
  };

  return { confirmNavigation };
}
