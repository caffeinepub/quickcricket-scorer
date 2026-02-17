import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trophy, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import { useListMatches, useDeleteMatch } from '../hooks/useQueries';
import { useConnectivity } from '../hooks/useConnectivity';
import { useLocalMatchIntegrity } from '../hooks/useLocalMatchIntegrity';
import DeleteMatchConfirmDialog from '../components/DeleteMatchConfirmDialog';
import type { Match } from '../backend';
import { toast } from 'sonner';
import { loadLocalMatch } from '../offline/localMatchStore';

export default function MatchesDashboardPage() {
  const navigate = useNavigate();
  const { data: matches = [], isLoading, error, refetch } = useListMatches();
  const { isOffline } = useConnectivity();
  const { hasCorruptedMatches, retry } = useLocalMatchIntegrity(matches.length);
  const deleteMatch = useDeleteMatch();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState<Match | null>(null);

  const handleNewMatch = () => {
    try {
      navigate({ to: '/setup' });
    } catch (error) {
      console.error('Navigation to setup failed:', error);
      toast.error('Failed to navigate to match setup');
    }
  };

  const handleViewMatch = (matchId: bigint) => {
    try {
      navigate({ to: `/match/${matchId}` });
    } catch (error) {
      console.error('Navigation to match failed:', error);
      toast.error('Failed to navigate to match');
    }
  };

  const handleRetryIntegrityCheck = async () => {
    try {
      retry();
      toast.success('Storage check completed');
    } catch (error) {
      console.error('Integrity check retry failed:', error);
      toast.error('Failed to check storage');
    }
  };

  const handleDeleteClick = (match: Match) => {
    setMatchToDelete(match);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!matchToDelete) return;

    try {
      await deleteMatch.mutateAsync(matchToDelete.id);
      toast.success('Match deleted successfully');
      setDeleteDialogOpen(false);
      setMatchToDelete(null);
    } catch (error) {
      console.error('Delete match failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete match');
    }
  };

  const isMatchLocalOnly = (matchId: bigint): boolean => {
    try {
      const localMatch = loadLocalMatch(matchId);
      return localMatch?._localOnly ?? false;
    } catch {
      return false;
    }
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading matches...</div>;
  }

  if (error) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8 sm:p-12 text-center">
          <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold mb-2">Could Not Load Matches</h3>
          <p className="text-sm sm:text-base text-muted-foreground mb-6">
            {error instanceof Error ? error.message : 'Failed to load matches from this device'}
          </p>
          <Button onClick={() => refetch()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">My Matches</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Track and manage your cricket matches</p>
        </div>
        <Button onClick={handleNewMatch} size="default" className="self-start sm:self-auto">
          <Plus className="h-4 w-4 mr-2" />
          New Match
        </Button>
      </div>

      {hasCorruptedMatches && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2 min-w-0">
                <p className="text-sm font-medium text-destructive">Storage Issue Detected</p>
                <p className="text-sm text-muted-foreground">
                  Some match data on this device may be corrupted. Try refreshing the page or clearing your browser storage.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleRetryIntegrityCheck} className="shrink-0">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Check
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {matches.length === 0 ? (
        <Card>
          <CardContent className="p-8 sm:p-12 text-center">
            <Trophy className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold mb-2">No Matches Yet</h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-6">
              Create your first match to start scoring
            </p>
            <Button onClick={handleNewMatch}>
              <Plus className="h-4 w-4 mr-2" />
              Create Match
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:gap-6">
          {matches.map((match: Match) => {
            const team1 = match.teams[0];
            const team2 = match.teams[1];
            const hasInnings = match.innings.length > 0;
            const isComplete = match.innings.length === 2;
            const matchTitle = `${team1?.name || 'Team 1'} vs ${team2?.name || 'Team 2'}`;

            return (
              <Card key={Number(match.id)} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg sm:text-xl break-words">
                        {matchTitle}
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Match #{Number(match.id)}
                        {match.oversPerInnings && ` • ${Number(match.oversPerInnings)} overs`}
                      </CardDescription>
                    </div>
                    <Badge variant={isComplete ? 'secondary' : hasInnings ? 'default' : 'outline'} className="self-start sm:self-auto shrink-0">
                      {isComplete ? 'Completed' : hasInnings ? 'In Progress' : 'Not Started'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <Button
                      onClick={() => handleViewMatch(match.id)}
                      variant="default"
                      className="flex-1"
                      size="sm"
                    >
                      {isComplete ? 'View Summary' : hasInnings ? 'Continue Scoring' : 'Start Match'}
                    </Button>
                    <Button
                      onClick={() => handleDeleteClick(match)}
                      variant="outline"
                      size="sm"
                      disabled={deleteMatch.isPending}
                      className="sm:w-auto"
                    >
                      <Trash2 className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Delete</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {matchToDelete && (
        <DeleteMatchConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleDeleteConfirm}
          isLocalOnly={isMatchLocalOnly(matchToDelete.id)}
          isOnline={!isOffline}
          matchTitle={`${matchToDelete.teams[0]?.name || 'Team 1'} vs ${matchToDelete.teams[1]?.name || 'Team 2'}`}
        />
      )}
    </div>
  );
}
