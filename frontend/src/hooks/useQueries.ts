import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import type {
  Match,
  Team,
  TossInfo,
  Innings,
  BattingStats,
  BowlingStats,
  SavedTeam,
  UserProfile,
} from '../backend';
import { localMatchStore } from '../offline/localMatchStore';
import { ensureMatchInitialized } from '../utils/ensureMatchInitialized';
import { toast } from 'sonner';

// ============================================
// User Profile Queries
// ============================================

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
    onError: (error: Error) => {
      console.error('Failed to save user profile:', error);
      toast.error('Failed to save profile. Please try again.');
    },
  });
}

// ============================================
// Match Queries
// ============================================

export function useGetMatch(matchId: bigint | null) {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<Match | null>({
    queryKey: ['match', matchId?.toString()],
    queryFn: async () => {
      if (!matchId) return null;

      // Try local storage first
      const localMatch = localMatchStore.loadMatch(matchId);
      if (localMatch) {
        console.log('useGetMatch: Loaded match from local storage', {
          matchId: matchId.toString(),
          hasInnings: localMatch.innings.length > 0,
          battingTeamPlayers: localMatch.innings[0]?.battingTeam?.players?.length || 0,
          bowlingTeamPlayers: localMatch.innings[0]?.bowlingTeam?.players?.length || 0,
        });

        // Validate innings team rosters
        if (localMatch.innings.length > 0) {
          const currentInnings = localMatch.innings[localMatch.innings.length - 1];
          if (!currentInnings.battingTeam?.players || currentInnings.battingTeam.players.length === 0) {
            console.error('useGetMatch: Batting team has no players in local storage', currentInnings);
          }
          if (!currentInnings.bowlingTeam?.players || currentInnings.bowlingTeam.players.length === 0) {
            console.error('useGetMatch: Bowling team has no players in local storage', currentInnings);
          }
        }

        return localMatch;
      }

      // If online and authenticated, try backend
      if (actor && identity) {
        try {
          const backendMatch = await actor.getMatch(matchId);
          if (backendMatch) {
            console.log('useGetMatch: Loaded match from backend', {
              matchId: matchId.toString(),
              hasInnings: backendMatch.innings.length > 0,
            });
            // Save to local storage for offline access
            localMatchStore.saveMatch(backendMatch);
            return backendMatch;
          }
        } catch (error) {
          console.error('useGetMatch: Backend fetch failed, using local only', error);
        }
      }

      return null;
    },
    enabled: !!matchId,
    staleTime: 0,
    retry: 1,
  });
}

export function useListMatches() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<Match[]>({
    queryKey: ['matches'],
    queryFn: async () => {
      const localMatches = localMatchStore.loadAllMatches();

      if (actor && identity) {
        try {
          const backendMatches = await actor.listMatches();
          const mergedMatches = new Map<string, Match>();

          localMatches.forEach((m) => mergedMatches.set(m.id.toString(), m));
          backendMatches.forEach((m) => mergedMatches.set(m.id.toString(), m));

          return Array.from(mergedMatches.values());
        } catch (error) {
          console.error('Failed to fetch backend matches, using local only:', error);
          return localMatches;
        }
      }

      return localMatches;
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30000,
  });
}

export function useCreateMatch() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teams,
      oversPerInnings,
      toss,
    }: {
      teams: Team[];
      oversPerInnings: bigint | null;
      toss: TossInfo | null;
    }) => {
      if (!toss) {
        throw new Error('Toss information is required to create a match');
      }

      // Validate teams have players
      for (const team of teams) {
        if (!team.players || team.players.length === 0) {
          throw new Error(`Team "${team.name}" has no players`);
        }
      }

      let matchId: bigint;
      let isLocalOnly = false;

      if (actor && identity) {
        try {
          matchId = await actor.createMatch(teams, oversPerInnings, toss);
          console.log('useCreateMatch: Created match on backend', matchId.toString());
        } catch (error) {
          console.error('useCreateMatch: Backend creation failed, creating local match', error);
          matchId = localMatchStore.generateLocalMatchId();
          isLocalOnly = true;
          toast.warning('Match created offline. It will sync when you reconnect.');
        }
      } else {
        matchId = localMatchStore.generateLocalMatchId();
        isLocalOnly = true;
        console.log('useCreateMatch: Created local-only match', matchId.toString());
      }

      const newMatch: Match = {
        id: matchId,
        owner: identity?.getPrincipal() || { toText: () => 'anonymous' } as any,
        teams,
        innings: [],
        oversPerInnings: oversPerInnings || undefined,
        toss,
      };

      // Initialize the first innings with complete team rosters
      const initializedMatch = ensureMatchInitialized(newMatch);

      console.log('useCreateMatch: Initialized match with innings', {
        matchId: matchId.toString(),
        hasInnings: initializedMatch.innings.length > 0,
        battingTeamPlayers: initializedMatch.innings[0]?.battingTeam?.players?.length || 0,
        bowlingTeamPlayers: initializedMatch.innings[0]?.bowlingTeam?.players?.length || 0,
      });

      // Save to local storage with complete team rosters
      localMatchStore.saveMatch(initializedMatch);

      return { matchId, isLocalOnly };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
    onError: (error: Error) => {
      console.error('Failed to create match:', error);
      toast.error(error.message || 'Failed to create match. Please try again.');
    },
  });
}

export function useDeleteMatch() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ matchId, isLocalOnly }: { matchId: bigint; isLocalOnly: boolean }) => {
      localMatchStore.deleteMatch(matchId);

      if (actor && identity && !isLocalOnly) {
        try {
          await actor.deleteMatch(matchId);
        } catch (error) {
          console.error('Failed to delete match from backend:', error);
          toast.warning('Match deleted locally. Backend deletion failed.');
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      toast.success('Match deleted successfully');
    },
    onError: (error: Error) => {
      console.error('Failed to delete match:', error);
      toast.error('Failed to delete match. Please try again.');
    },
  });
}

export function useStartInnings() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ matchId, newInnings }: { matchId: bigint; newInnings: Innings }) => {
      // Validate innings has team rosters
      if (!newInnings.battingTeam?.players || newInnings.battingTeam.players.length === 0) {
        throw new Error('Batting team has no players');
      }
      if (!newInnings.bowlingTeam?.players || newInnings.bowlingTeam.players.length === 0) {
        throw new Error('Bowling team has no players');
      }

      const localMatch = localMatchStore.loadMatch(matchId);
      if (!localMatch) {
        throw new Error('Match not found in local storage');
      }

      const updatedMatch: Match = {
        ...localMatch,
        innings: [...localMatch.innings, newInnings],
      };

      localMatchStore.saveMatch(updatedMatch);

      if (actor && identity) {
        try {
          await actor.startSecondInnings(matchId, newInnings);
        } catch (error) {
          console.error('Failed to sync second innings to backend:', error);
          toast.warning('Second innings started offline. It will sync when you reconnect.');
        }
      }
    },
    onSuccess: (_, { matchId }) => {
      queryClient.invalidateQueries({ queryKey: ['match', matchId.toString()] });
      toast.success('Second innings started successfully');
    },
    onError: (error: Error) => {
      console.error('Failed to start second innings:', error);
      toast.error(error.message || 'Failed to start second innings. Please try again.');
    },
  });
}

export function useUndoLastBall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (matchId: bigint) => {
      const success = localMatchStore.undoLastBall(matchId);
      if (!success) {
        throw new Error('Failed to undo last ball. No balls to undo.');
      }
      return matchId;
    },
    onSuccess: (matchId) => {
      queryClient.invalidateQueries({ queryKey: ['match', matchId.toString()] });
      toast.success('Last ball undone successfully');
    },
    onError: (error: Error) => {
      console.error('Failed to undo last ball:', error);
      toast.error(error.message || 'Failed to undo last ball.');
    },
  });
}

// ============================================
// Saved Team Queries
// ============================================

export function useGetCallerSavedTeam() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<SavedTeam | null>({
    queryKey: ['savedTeam'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerSavedTeam();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 60000,
  });
}

export function useSaveTeam() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (team: Team) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveTeam(team);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedTeam'] });
      toast.success('Team saved successfully');
    },
    onError: (error: Error) => {
      console.error('Failed to save team:', error);
      toast.error('Failed to save team. Please try again.');
    },
  });
}

// ============================================
// Player Stats Queries
// ============================================

export function useUpdatePlayerStats() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async ({
      playerName,
      batting,
      bowling,
    }: {
      playerName: string;
      batting: BattingStats;
      bowling: BowlingStats;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updatePlayerStats(playerName, batting, bowling);
    },
    onError: (error: Error) => {
      console.error('Failed to update player stats:', error);
    },
  });
}
