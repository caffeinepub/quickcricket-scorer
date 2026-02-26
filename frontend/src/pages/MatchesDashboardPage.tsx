import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useListMatches, useDeleteMatch } from '../hooks/useQueries';
import { useLocalMatchIntegrity } from '../hooks/useLocalMatchIntegrity';
import { useConnectivity } from '../hooks/useConnectivity';
import { loadLocalMatch } from '../offline/localMatchStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import DeleteMatchConfirmDialog from '../components/DeleteMatchConfirmDialog';
import ConnectivityStatus from '../components/ConnectivityStatus';
import type { Match } from '../backend';

export default function MatchesDashboardPage() {
  const navigate = useNavigate();
  const { data: matches, isLoading, refetch } = useListMatches();
  const deleteMatch = useDeleteMatch();
  const { hasCorruptedMatches, integrity, retry: retryIntegrityCheck } = useLocalMatchIntegrity();
  const { isOffline } = useConnectivity();

  const [matchToDelete, setMatchToDelete] = useState<bigint | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const corruptedCount = integrity?.corruptedMatches.length || 0;

  useEffect(() => {
    retryIntegrityCheck();
  }, [matches, retryIntegrityCheck]);

  const handleDeleteClick = (matchId: bigint) => {
    setMatchToDelete(matchId);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!matchToDelete) return;

    const localMatch = loadLocalMatch(matchToDelete);
    const isLocalOnly = (localMatch as any)?._localOnly === true;

    await deleteMatch.mutateAsync({ matchId: matchToDelete, isLocalOnly });
    setShowDeleteDialog(false);
    setMatchToDelete(null);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <p className="text-center text-muted-foreground">Loading matches...</p>
      </div>
    );
  }

  // Get match title for delete dialog
  const matchToDeleteData = matchToDelete ? loadLocalMatch(matchToDelete) : null;
  const matchTitle = matchToDeleteData
    ? `${matchToDeleteData.teams[0]?.name || 'Team 1'} vs ${matchToDeleteData.teams[1]?.name || 'Team 2'}`
    : '';
  const isLocalOnly = matchToDeleteData ? (matchToDeleteData as any)?._localOnly === true : false;

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cricket Matches</h1>
        <ConnectivityStatus />
      </div>

      {hasCorruptedMatches && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {corruptedCount} corrupted {corruptedCount === 1 ? 'match' : 'matches'} detected in local storage.
            Some matches may not load correctly.
          </AlertDescription>
        </Alert>
      )}

      <Button onClick={() => navigate({ to: '/match/setup' })} className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        Create New Match
      </Button>

      <div className="space-y-3">
        {matches && matches.length > 0 ? (
          matches.map((match: Match) => {
            const isLocalOnly = (match as any)._localOnly === true;
            const inningsCount = match.innings.length;
            const isComplete = inningsCount === 2;

            return (
              <Card key={match.id.toString()} className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div
                      className="flex-1"
                      onClick={() => navigate({ to: `/match/${match.id}` })}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">
                          {match.teams[0]?.name || 'Team 1'} vs {match.teams[1]?.name || 'Team 2'}
                        </h3>
                        {isLocalOnly && (
                          <Badge variant="outline" className="text-xs">
                            Local Only
                          </Badge>
                        )}
                        {isComplete && (
                          <Badge variant="secondary" className="text-xs">
                            Complete
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {inningsCount === 0 && 'Not started'}
                        {inningsCount === 1 && 'First innings in progress'}
                        {inningsCount === 2 && 'Match complete'}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(match.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No matches yet. Create your first match to get started!</p>
            </CardContent>
          </Card>
        )}
      </div>

      {matchToDelete && (
        <DeleteMatchConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={handleDeleteConfirm}
          isLocalOnly={isLocalOnly}
          isOnline={!isOffline}
          matchTitle={matchTitle}
        />
      )}
    </div>
  );
}
