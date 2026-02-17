// Hook that checks local match storage integrity and exposes retryable result

import { useState, useEffect } from 'react';
import { checkLocalMatchIntegrity } from '../offline/localMatchStore';

export function useLocalMatchIntegrity(triggerCheck?: number) {
  const [integrity, setIntegrity] = useState<{
    totalMatches: number;
    loadableMatches: number;
    corruptedMatches: string[];
  } | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [checkCount, setCheckCount] = useState(0);

  useEffect(() => {
    setIsChecking(true);
    try {
      const result = checkLocalMatchIntegrity();
      setIntegrity(result);
    } catch (error) {
      console.error('Failed to check integrity:', error);
      setIntegrity(null);
    } finally {
      setIsChecking(false);
    }
  }, [checkCount, triggerCheck]);

  const retry = () => {
    setCheckCount((prev) => prev + 1);
  };

  const hasCorruptedMatches = integrity ? integrity.corruptedMatches.length > 0 : false;

  return {
    integrity,
    isChecking,
    hasCorruptedMatches,
    retry,
  };
}
