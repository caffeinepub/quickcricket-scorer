import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useConnectivity } from './useConnectivity';
import type { UserProfile, Match, Team, Ball, Innings } from '../backend';
import {
  saveLocalMatch,
  loadLocalMatch,
  loadAllLocalMatches,
  generateLocalMatchId,
  updateLocalMatchInnings,
  addBallToLocalMatch,
  deleteLocalMatch,
  LocalStorageError,
  type LocalMatch,
} from '../offline/localMatchStore';
import { handleOfflineError } from '../offline/offlineDiagnostics';

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

export function useListMatches() {
  const { actor, isFetching: actorFetching } = useActor();
  const { isOffline, isAuthenticated } = useConnectivity();

  return useQuery<LocalMatch[]>({
    queryKey: ['matches'],
    queryFn: async () => {
      // If offline (device network down or backend unavailable), load from local storage
      if (isOffline) {
        try {
          return loadAllLocalMatches();
        } catch (error) {
          if (error instanceof LocalStorageError) {
            throw new Error(`Could not load saved matches from this device: ${error.message}`);
          }
          throw new Error('Could not load saved matches from this device');
        }
      }

      // If unauthenticated but online, only show local matches
      if (!isAuthenticated || !actor) {
        try {
          return loadAllLocalMatches();
        } catch (error) {
          if (error instanceof LocalStorageError) {
            throw new Error(`Could not load saved matches from this device: ${error.message}`);
          }
          throw new Error('Could not load saved matches from this device');
        }
      }

      // When authenticated and online, fetch from backend + local-only matches
      try {
        const backendMatches = await actor.listMatches();
        // Also include local-only matches
        let localMatches: LocalMatch[] = [];
        try {
          localMatches = loadAllLocalMatches().filter((m) => m._localOnly);
        } catch (localError) {
          console.warn('Failed to load local-only matches:', localError);
        }
        return [...backendMatches, ...localMatches];
      } catch (error) {
        console.error('Failed to fetch matches from backend, using local:', error);
        try {
          return loadAllLocalMatches();
        } catch (localError) {
          if (localError instanceof LocalStorageError) {
            throw new Error(`Could not load saved matches from this device: ${localError.message}`);
          }
          throw new Error('Could not load saved matches from this device');
        }
      }
    },
    enabled: !actorFetching,
  });
}

export function useGetMatch(matchId: bigint) {
  const { actor, isFetching: actorFetching } = useActor();
  const { isOffline, isAuthenticated } = useConnectivity();

  return useQuery<LocalMatch | null>({
    queryKey: ['match', matchId.toString()],
    queryFn: async () => {
      // Try local storage first
      let localMatch: LocalMatch | null = null;
      try {
        localMatch = loadLocalMatch(matchId);
      } catch (error) {
        if (error instanceof LocalStorageError) {
          throw new Error(`Could not load match from this device: ${error.message}`);
        }
        console.error('Failed to load local match:', error);
      }

      // If offline, use local data only
      if (isOffline) {
        if (!localMatch) {
          throw new Error('Match not found on this device. You may need to be online to access this match.');
        }
        return localMatch;
      }

      // If unauthenticated but online, use local data only
      if (!isAuthenticated || !actor) {
        if (!localMatch) {
          throw new Error('Match not found on this device. You may need to log in to access this match.');
        }
        return localMatch;
      }

      // When online and authenticated, try backend (unless it's a local-only match)
      if (localMatch?._localOnly) {
        return localMatch;
      }

      try {
        const backendMatch = await actor.getMatch(matchId);
        // Save to local storage for offline access
        if (backendMatch) {
          try {
            saveLocalMatch(backendMatch, false);
          } catch (saveError) {
            console.warn('Failed to cache match locally:', saveError);
          }
        }
        return backendMatch;
      } catch (error) {
        console.error('Failed to fetch match from backend, using local:', error);
        if (!localMatch) {
          throw new Error('Match not found on backend or this device');
        }
        return localMatch;
      }
    },
    enabled: !actorFetching,
  });
}

export function useCreateMatch() {
  const { actor } = useActor();
  const { isOffline, isAuthenticated } = useConnectivity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teams, oversPerInnings }: { teams: Team[]; oversPerInnings: bigint | null }) => {
      // If offline or unauthenticated, create match locally
      if (isOffline || !isAuthenticated || !actor) {
        const matchId = generateLocalMatchId();
        const localMatch: Match = {
          id: matchId,
          owner: 'local-user' as any, // Placeholder for offline
          teams,
          innings: [],
          oversPerInnings: oversPerInnings ?? undefined,
        };
        try {
          saveLocalMatch(localMatch, true);
          return matchId;
        } catch (error) {
          const message = handleOfflineError('save-match', 'createMatch (offline)', error);
          throw new Error(message);
        }
      }

      // When online and authenticated, create on backend
      try {
        const matchId = await actor.createMatch(teams, oversPerInnings ?? null);
        // Also save locally for offline access
        const match: Match = {
          id: matchId,
          owner: 'backend' as any,
          teams,
          innings: [],
          oversPerInnings: oversPerInnings ?? undefined,
        };
        try {
          saveLocalMatch(match, false);
        } catch (localError) {
          console.warn('Failed to cache match locally:', localError);
        }
        return matchId;
      } catch (error) {
        console.error('Backend create failed, falling back to local:', error);
        // Fallback to local creation
        const matchId = generateLocalMatchId();
        const localMatch: Match = {
          id: matchId,
          owner: 'local-user' as any,
          teams,
          innings: [],
          oversPerInnings: oversPerInnings ?? undefined,
        };
        try {
          saveLocalMatch(localMatch, true);
          return matchId;
        } catch (localError) {
          const message = handleOfflineError('save-match', 'createMatch (fallback)', localError);
          throw new Error(message);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}

export function useStartInnings() {
  const { actor } = useActor();
  const { isOffline, isAuthenticated } = useConnectivity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      matchId,
      battingTeam,
      bowlingTeam,
      overs,
    }: {
      matchId: bigint;
      battingTeam: Team;
      bowlingTeam: Team;
      overs: bigint | null;
    }) => {
      // Load the match to check if it's local-only
      let localMatch: LocalMatch | null = null;
      try {
        localMatch = loadLocalMatch(matchId);
      } catch (error) {
        console.error('Failed to load match for innings start:', error);
      }

      const isLocalOnly = localMatch?._localOnly || isOffline || !isAuthenticated || !actor;

      if (isLocalOnly) {
        // Create innings locally
        const newInnings: Innings = {
          battingTeam,
          bowlingTeam,
          balls: [],
          totalRuns: BigInt(0),
          totalWickets: BigInt(0),
          overs: overs ?? undefined,
          ballsInCurrentOver: BigInt(0),
        };

        try {
          const currentInnings = localMatch?.innings || [];
          updateLocalMatchInnings(matchId, [...currentInnings, newInnings]);
        } catch (error) {
          const message = handleOfflineError('save-innings', 'startInnings (offline)', error);
          throw new Error(message);
        }
        return;
      }

      // When online and authenticated, start on backend
      try {
        await actor.startInnings(matchId, battingTeam, bowlingTeam, overs ?? null);
        // Update local cache
        const newInnings: Innings = {
          battingTeam,
          bowlingTeam,
          balls: [],
          totalRuns: BigInt(0),
          totalWickets: BigInt(0),
          overs: overs ?? undefined,
          ballsInCurrentOver: BigInt(0),
        };
        try {
          const currentInnings = localMatch?.innings || [];
          updateLocalMatchInnings(matchId, [...currentInnings, newInnings]);
        } catch (localError) {
          console.warn('Failed to update local cache:', localError);
        }
      } catch (error) {
        console.error('Backend startInnings failed, falling back to local:', error);
        // Fallback to local
        const newInnings: Innings = {
          battingTeam,
          bowlingTeam,
          balls: [],
          totalRuns: BigInt(0),
          totalWickets: BigInt(0),
          overs: overs ?? undefined,
          ballsInCurrentOver: BigInt(0),
        };
        try {
          const currentInnings = localMatch?.innings || [];
          updateLocalMatchInnings(matchId, [...currentInnings, newInnings]);
        } catch (localError) {
          const message = handleOfflineError('save-innings', 'startInnings (fallback)', localError);
          throw new Error(message);
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['match', variables.matchId.toString()] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}

export function useRecordBall() {
  const { actor } = useActor();
  const { isOffline, isAuthenticated } = useConnectivity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ matchId, inningsIndex, ball }: { matchId: bigint; inningsIndex: number; ball: Ball }) => {
      // Load the match to check if it's local-only
      let localMatch: LocalMatch | null = null;
      try {
        localMatch = loadLocalMatch(matchId);
      } catch (error) {
        console.error('Failed to load match for ball recording:', error);
      }

      const isLocalOnly = localMatch?._localOnly || isOffline || !isAuthenticated || !actor;

      if (isLocalOnly) {
        try {
          addBallToLocalMatch(matchId, inningsIndex, ball);
        } catch (error) {
          const message = handleOfflineError('record-ball', 'recordBall (offline)', error);
          throw new Error(message);
        }
        return;
      }

      // When online and authenticated, record on backend
      try {
        await actor.recordBall(matchId, BigInt(inningsIndex), ball);
        // Update local cache
        try {
          addBallToLocalMatch(matchId, inningsIndex, ball);
        } catch (localError) {
          console.warn('Failed to update local cache:', localError);
        }
      } catch (error) {
        console.error('Backend recordBall failed, falling back to local:', error);
        // Fallback to local
        try {
          addBallToLocalMatch(matchId, inningsIndex, ball);
        } catch (localError) {
          const message = handleOfflineError('record-ball', 'recordBall (fallback)', localError);
          throw new Error(message);
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['match', variables.matchId.toString()] });
    },
  });
}

export function useDeleteMatch() {
  const { actor } = useActor();
  const { isOffline, isAuthenticated } = useConnectivity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (matchId: bigint) => {
      // Load the match to check if it's local-only
      let localMatch: LocalMatch | null = null;
      try {
        localMatch = loadLocalMatch(matchId);
      } catch (error) {
        console.error('Failed to load match for deletion:', error);
      }

      const isLocalOnly = localMatch?._localOnly || isOffline || !isAuthenticated || !actor;

      // Always delete from local storage
      try {
        deleteLocalMatch(matchId);
      } catch (error) {
        const message = handleOfflineError('delete-match', 'deleteMatch (local)', error);
        throw new Error(message);
      }

      // If not local-only and online, also delete from backend
      if (!isLocalOnly && actor) {
        try {
          await actor.deleteMatch(matchId);
        } catch (error) {
          console.error('Failed to delete from backend:', error);
          // Don't throw - local deletion succeeded
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}
