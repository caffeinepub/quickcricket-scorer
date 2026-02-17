// Connectivity hook that probes backend availability and exposes online/offline state with reasons
// Separates device network status from backend/authentication availability

import { useState, useEffect } from 'react';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';

export type OfflineReason = 'network-down' | 'backend-unavailable' | null;

export function useConnectivity() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [backendAvailable, setBackendAvailable] = useState(true);
  const [lastProbeTime, setLastProbeTime] = useState(Date.now());

  // Device network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Backend availability probe
  useEffect(() => {
    if (!isOnline || !actor || isFetching) {
      return;
    }

    const probeBackend = async () => {
      try {
        // Lightweight probe: try to get caller role (works for both authenticated and anonymous)
        await actor.getCallerUserRole();
        setBackendAvailable(true);
      } catch (error) {
        console.warn('Backend probe failed:', error);
        setBackendAvailable(false);
      }
      setLastProbeTime(Date.now());
    };

    // Initial probe
    probeBackend();

    // Periodic probe every 10 seconds
    const interval = setInterval(probeBackend, 10000);

    // Probe on visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        probeBackend();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Probe on focus
    const handleFocus = () => {
      probeBackend();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [actor, isFetching, isOnline]);

  const isAuthenticated = !!identity;
  const networkOnline = isOnline;

  // Determine offline state and reason
  let offlineReason: OfflineReason = null;
  let deviceOffline = false;

  if (!networkOnline) {
    deviceOffline = true;
    offlineReason = 'network-down';
  } else if (!backendAvailable) {
    deviceOffline = true;
    offlineReason = 'backend-unavailable';
  }

  return {
    isOnline: !deviceOffline,
    isOffline: deviceOffline,
    offlineReason,
    networkOnline,
    backendAvailable,
    isAuthenticated,
    lastProbeTime,
  };
}
