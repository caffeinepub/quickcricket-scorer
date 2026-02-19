import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import { useConnectivity } from './useConnectivity';
import {
  saveLocalMatch,
  loadLocalMatch,
  loadAllLocalMatches,
  deleteLocalMatch,
  recordBallLocally,
  undoLastBall,
} from '../offline/localMatchStore';
import { computeCumulativePlayerStats } from '../utils/cumulativePlayerStats';
import { savePlayerStatsCache } from '../offline/playerStatsStore';
import { normalizeBackendAuthError } from '../utils/backendAuthErrors';
import { ensureMatchInitialized } from '../utils/ensureMatchInitialized';
import type { Match, Team, TossInfo, Ball, UserProfile, Innings } from '../backend';
import { toast } from 'sonner';

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

export function useCreateMatch() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const { isOffline } = useConnectivity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teams,
      oversPerInnings,
      toss,
    }: {
      teams: Team[];
      oversPerInnings: bigint;
      toss: TossInfo;
    }) => {
      // Check if user is authenticated with Internet Identity
      const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();

      // If not authenticated or offline, create local-only match
      if (!isAuthenticated || isOffline || !actor) {
        const localMatchId = BigInt(Date.now());
        
        const localMatch: Match = {
          id: localMatchId,
          owner: identity?.getPrincipal() ?? { toText: () => 'anonymous' } as any,
          teams,
          innings: [],
          oversPerInnings,
          toss,
        };

        // Initialize the match with first innings
        const initializedMatch = ensureMatchInitialized(localMatch);
        saveLocalMatch(initializedMatch, true);
        return localMatchId;
      }

      // User is authenticated, try to create match on backend
      try {
        const matchId = await actor.createMatch(teams, oversPerInnings, toss);
        
        // Fetch the newly created match from backend
        const backendMatch = await actor.getMatch(matchId);
        
        if (backendMatch) {
          // Ensure it's initialized before saving locally
          const initializedMatch = ensureMatchInitialized(backendMatch);
          saveLocalMatch(initializedMatch, false);
        }
        
        return matchId;
      } catch (error) {
        // Check if it's an authorization error
        const authError = normalizeBackendAuthError(error);
        if (authError.isAuthError) {
          // Throw a user-friendly error
          throw new Error(authError.userMessage);
        }
        // Re-throw other errors as-is
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}

export function useListMatches() {
  const { actor, isFetching: actorFetching } = useActor();
  const { isOffline } = useConnectivity();

  return useQuery<Match[]>({
    queryKey: ['matches'],
    queryFn: async () => {
      if (isOffline || !actor) {
        return loadAllLocalMatches();
      }
      
      try {
        const backendMatches = await actor.listMatches();
        backendMatches.forEach(match => {
          // Ensure each match is initialized before saving
          const initializedMatch = ensureMatchInitialized(match);
          saveLocalMatch(initializedMatch, false);
        });
        return backendMatches;
      } catch (error) {
        console.warn('Failed to fetch from backend, using local matches:', error);
        return loadAllLocalMatches();
      }
    },
    enabled: !actorFetching,
  });
}

export function useGetMatch(matchId: bigint) {
  const { actor, isFetching: actorFetching } = useActor();
  const { isOffline } = useConnectivity();

  return useQuery<Match | null>({
    queryKey: ['match', matchId.toString()],
    queryFn: async () => {
      const localMatch = loadLocalMatch(matchId);
      
      if (isOffline || !actor) {
        return localMatch ? ensureMatchInitialized(localMatch) : null;
      }

      try {
        const backendMatch = await actor.getMatch(matchId);
        if (backendMatch) {
          const initializedMatch = ensureMatchInitialized(backendMatch);
          saveLocalMatch(initializedMatch, false);
          return initializedMatch;
        }
        return localMatch ? ensureMatchInitialized(localMatch) : null;
      } catch (error) {
        console.warn('Failed to fetch match from backend, using local:', error);
        return localMatch ? ensureMatchInitialized(localMatch) : null;
      }
    },
    enabled: !actorFetching && matchId > BigInt(0),
  });
}

export function useDeleteMatch() {
  const { actor } = useActor();
  const { isOffline } = useConnectivity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (matchId: bigint) => {
      const localMatch = loadLocalMatch(matchId);
      const isLocalOnly = localMatch?._localOnly === true;

      if (!isLocalOnly && !isOffline && actor) {
        try {
          await actor.deleteMatch(matchId);
        } catch (error) {
          console.warn('Failed to delete from backend:', error);
        }
      }

      deleteLocalMatch(matchId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}

export function useRecordBall() {
  const { actor } = useActor();
  const { isOffline } = useConnectivity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      matchId,
      inningsIndex,
      ball,
    }: {
      matchId: bigint;
      inningsIndex: number;
      ball: Ball;
    }) => {
      const updatedMatch = recordBallLocally(matchId, inningsIndex, ball);
      
      const isLocalOnly = (updatedMatch as any)?._localOnly === true;
      
      if (!isOffline && actor && updatedMatch && !isLocalOnly) {
        try {
          // Backend sync would go here if supported
        } catch (error) {
          console.warn('Failed to sync ball to backend:', error);
        }
      }

      // Update cumulative player stats cache
      const allMatches = loadAllLocalMatches();
      const statsMap = computeCumulativePlayerStats(allMatches);
      savePlayerStatsCache(statsMap);

      return updatedMatch;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['match', variables.matchId.toString()] });
    },
  });
}

export function useUndoLastBall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ matchId }: { matchId: bigint }) => {
      const updatedMatch = undoLastBall(matchId);
      if (!updatedMatch) {
        throw new Error('No balls to undo');
      }

      // Update cumulative player stats cache
      const allMatches = loadAllLocalMatches();
      const statsMap = computeCumulativePlayerStats(allMatches);
      savePlayerStatsCache(statsMap);

      return updatedMatch;
    },
    onSuccess: (updatedMatch) => {
      queryClient.invalidateQueries({ queryKey: ['match', updatedMatch.id.toString()] });
      toast.success('Last ball undone');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useStartInnings() {
  const { actor } = useActor();
  const { isOffline } = useConnectivity();
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
      const match = loadLocalMatch(matchId);
      if (!match) {
        throw new Error('Match not found. The match may have been deleted or the data is corrupted.');
      }

      // Check if this is a second innings start
      if (match.innings.length !== 1) {
        throw new Error('Second innings can only be started when exactly one innings exists.');
      }

      const newInnings: Innings = {
        battingTeam,
        bowlingTeam,
        balls: [],
        totalRuns: BigInt(0),
        totalWickets: BigInt(0),
        overs: overs || undefined,
        ballsInCurrentOver: BigInt(0),
      };

      const isLocalOnly = (match as any)._localOnly === true;

      // If backend-stored match and online with actor, call backend
      if (!isLocalOnly && !isOffline && actor) {
        try {
          await actor.startSecondInnings(matchId, newInnings);
          
          // Fetch the updated match from backend
          const backendMatch = await actor.getMatch(matchId);
          if (!backendMatch) {
            throw new Error('Failed to retrieve updated match from backend after starting second innings.');
          }
          
          // Save the backend match locally
          saveLocalMatch(backendMatch, false);
          return backendMatch;
        } catch (error) {
          // Check if it's an authorization error
          const authError = normalizeBackendAuthError(error);
          if (authError.isAuthError) {
            throw new Error(`Authorization failed: ${authError.userMessage}. The second innings was not started.`);
          }
          
          // For other backend errors, provide clear message
          const errorMessage = error instanceof Error ? error.message : 'Unknown backend error';
          throw new Error(`Failed to start second innings on backend: ${errorMessage}. The match remains in innings 1.`);
        }
      }

      // Local-only or offline: append innings locally
      const updatedMatch: Match = {
        ...match,
        innings: [...match.innings, newInnings],
      };

      saveLocalMatch(updatedMatch, isLocalOnly);
      return updatedMatch;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['match', variables.matchId.toString()] });
    },
  });
}
