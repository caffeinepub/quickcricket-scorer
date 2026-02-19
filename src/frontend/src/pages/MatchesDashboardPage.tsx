import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useListMatches, useDeleteMatch } from '../hooks/useQueries';
import { useConnectivity } from '../hooks/useConnectivity';
import { useLocalMatchIntegrity } from '../hooks/useLocalMatchIntegrity';
import { loadLocalMatch } from '../offline/localMatchStore';
import type { Match } from '../backend';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import DeleteMatchConfirmDialog from '../components/DeleteMatchConfirmDialog';

export default function MatchesDashboardPage() {
  const navigate = useNavigate();
  const { data: matches, isLoading, error, refetch } = useListMatches();
  const deleteMatch = useDeleteMatch();
  const { isOnline } = useConnectivity();
  const { integrity, hasCorruptedMatches, retry: retryIntegrity } = useLocalMatchIntegrity(matches?.length);

  const [matchToDelete, setMatchToDelete] = useState<bigint | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDeleteClick = (matchId: bigint) => {
    setMatchToDelete(matchId);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!matchToDelete) return;

    try {
      await deleteMatch.mutateAsync(matchToDelete);
      setShowDeleteDialog(false);
      setMatchToDelete(null);
    } catch (error) {
      console.error('Failed to delete match:', error);
    }
  };

  const getMatchTitle = (match: Match): string => {
    if (match.teams.length >= 2) {
      return `${match.teams[0].name} vs ${match.teams[1].name}`;
    }
    return `Match ${match.id}`;
  };

  const getMatchStatus = (match: Match): string => {
    if (!match.innings || match.innings.length === 0) {
      return 'Not Started';
    }
    if (match.innings.length === 1) {
      return 'First Innings';
    }
    return 'Completed';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Loading matches...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load matches: {error.message}
          </AlertDescription>
        </Alert>
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  if (hasCorruptedMatches && integrity) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Local storage has {integrity.corruptedMatches.length} corrupted match(es). 
            Total matches: {integrity.totalMatches}, Loadable: {integrity.loadableMatches}
          </AlertDescription>
        </Alert>
        <Button onClick={retryIntegrity}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Matches</h1>
        <Button onClick={() => navigate({ to: '/match/setup' })}>
          <Plus className="mr-2 h-4 w-4" />
          New Match
        </Button>
      </div>

      {!matches || matches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No matches yet</p>
            <Button onClick={() => navigate({ to: '/match/setup' })}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Match
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {matches.map((match) => {
            const localMatch = loadLocalMatch(match.id);
            const isLocalOnly = localMatch?._localOnly === true;

            return (
              <Card key={match.id.toString()}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{getMatchTitle(match)}</CardTitle>
                      <CardDescription>{getMatchStatus(match)}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {isLocalOnly && (
                        <Badge variant="secondary">Local Only</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(match.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => navigate({ to: `/match/${match.id}` })}
                    variant="outline"
                    className="w-full"
                  >
                    View Match
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {matchToDelete && (
        <DeleteMatchConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={handleConfirmDelete}
          isOnline={isOnline}
          isLocalOnly={loadLocalMatch(matchToDelete)?._localOnly === true}
          matchTitle={getMatchTitle(matches?.find(m => m.id === matchToDelete) || {} as Match)}
        />
      )}
    </div>
  );
}
