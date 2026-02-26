import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useGetMatch, useUndoLastBall } from '../hooks/useQueries';
import { parseMatchId } from '../utils/parseMatchId';
import { ensureMatchInitialized } from '../utils/ensureMatchInitialized';
import { localMatchStore } from '../offline/localMatchStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Undo2, BarChart3 } from 'lucide-react';
import { BatterRoleSelector } from '../components/live/BatterRoleSelector';
import { NextBatterDialog } from '../components/live/NextBatterDialog';
import { NextBowlerDialog } from '../components/live/NextBowlerDialog';
import type { Player, Innings, Match } from '../backend';
import { getEligibleBatters, getEligibleNextBatters, getOutBatterIds } from '../utils/inningsEligibility';
import { isInningsCompleteByOvers, getCurrentOvers } from '../utils/inningsCompletion';
import { getLastOverViewModel } from '../utils/lastOver';
import { OverByOverBreakdown } from '../components/live/OverByOverBreakdown';
import { toast } from 'sonner';

export default function LiveScoringPage() {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { matchId?: string };
  const matchIdParam = params.matchId;

  const parseResult = parseMatchId(matchIdParam);
  const matchId = parseResult.success ? parseResult.value : null;

  const { data: match, isLoading: matchLoading, isFetching: matchFetching, refetch: refetchMatch } = useGetMatch(matchId);
  const undoMutation = useUndoLastBall();

  const [selectedStriker, setSelectedStriker] = useState<Player | null>(null);
  const [selectedNonStriker, setSelectedNonStriker] = useState<Player | null>(null);
  const [selectedBowler, setSelectedBowler] = useState<Player | null>(null);
  const [isWicket, setIsWicket] = useState(false);
  const [isWide, setIsWide] = useState(false);
  const [isNoBall, setIsNoBall] = useState(false);
  const [byes, setByes] = useState<number>(0);
  const [legByes, setLegByes] = useState<number>(0);

  const [showNextBatterDialog, setShowNextBatterDialog] = useState(false);
  const [showNextBowlerDialog, setShowNextBowlerDialog] = useState(false);

  // State for dialog selections
  const [pendingNextBatter, setPendingNextBatter] = useState<Player | null>(null);
  const [pendingNextBowler, setPendingNextBowler] = useState<Player | null>(null);

  const [rosterValidationError, setRosterValidationError] = useState<string | null>(null);
  const [isReloadingRosters, setIsReloadingRosters] = useState(false);

  // Ensure match has initialized innings when loaded
  const [initializedMatch, setInitializedMatch] = useState<Match | null>(null);

  useEffect(() => {
    if (match && matchId) {
      if (match.innings.length === 0) {
        const initialized = ensureMatchInitialized(match);
        if (initialized.innings.length > 0) {
          localMatchStore.saveMatch(initialized);
          setInitializedMatch(initialized);
          refetchMatch();
        } else {
          setInitializedMatch(match);
        }
      } else {
        setInitializedMatch(match);
      }
    } else if (!match) {
      setInitializedMatch(null);
    }
  }, [match, matchId]);

  const currentInnings: Innings | null =
    initializedMatch && initializedMatch.innings.length > 0
      ? initializedMatch.innings[initializedMatch.innings.length - 1]
      : null;

  // Validate and reload team rosters if missing
  useEffect(() => {
    if (!matchId || matchLoading || matchFetching) {
      return;
    }

    if (!currentInnings) {
      if (initializedMatch && initializedMatch.innings.length === 0) {
        setRosterValidationError('Match innings not initialized. Please return to dashboard.');
      }
      return;
    }

    const battingPlayers = currentInnings.battingTeam?.players || [];
    const bowlingPlayers = currentInnings.bowlingTeam?.players || [];

    if (battingPlayers.length === 0 || bowlingPlayers.length === 0) {
      console.error('LiveScoringPage: Team rosters are missing or empty', {
        battingPlayers: battingPlayers.length,
        bowlingPlayers: bowlingPlayers.length,
      });

      setRosterValidationError('Loading team rosters...');
      setIsReloadingRosters(true);

      refetchMatch()
        .then((result) => {
          if (result.data) {
            const reloadedInnings = result.data.innings[result.data.innings.length - 1];
            const reloadedBattingPlayers = reloadedInnings?.battingTeam?.players || [];
            const reloadedBowlingPlayers = reloadedInnings?.bowlingTeam?.players || [];

            if (reloadedBattingPlayers.length === 0 || reloadedBowlingPlayers.length === 0) {
              setRosterValidationError(
                'Unable to load team rosters. Please return to the dashboard and try again.'
              );
            } else {
              setRosterValidationError(null);
            }
          } else {
            setRosterValidationError(
              'Unable to load match data. Please return to the dashboard and try again.'
            );
          }
        })
        .catch((error) => {
          console.error('LiveScoringPage: Failed to reload match', error);
          setRosterValidationError(
            'Unable to load match data. Please return to the dashboard and try again.'
          );
        })
        .finally(() => {
          setIsReloadingRosters(false);
        });
    } else {
      setRosterValidationError(null);
      setIsReloadingRosters(false);
    }
  }, [matchId, matchLoading, matchFetching, currentInnings, initializedMatch, refetchMatch]);

  // Sync striker/non-striker from innings state
  useEffect(() => {
    if (currentInnings) {
      if (currentInnings.currentStriker && !selectedStriker) {
        setSelectedStriker(currentInnings.currentStriker);
      }
      if (currentInnings.currentNonStriker && !selectedNonStriker) {
        setSelectedNonStriker(currentInnings.currentNonStriker);
      }
      if (currentInnings.currentBowler && !selectedBowler) {
        setSelectedBowler(currentInnings.currentBowler);
      }
    }
  }, [currentInnings, selectedStriker, selectedNonStriker, selectedBowler]);

  if (!parseResult.success) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Invalid Match ID</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{parseResult.error}</p>
            <Button onClick={() => navigate({ to: '/' })}>Return to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (matchLoading || isReloadingRosters || (match && !initializedMatch)) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              {isReloadingRosters ? 'Loading team rosters...' : 'Loading match...'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!initializedMatch || !currentInnings) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Match Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Unable to load match data. Please return to the dashboard and try again.
            </p>
            <Button onClick={() => navigate({ to: '/' })}>Return to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const battingTeamPlayers = currentInnings.battingTeam?.players || [];
  const bowlingTeamPlayers = currentInnings.bowlingTeam?.players || [];
  const outBatterIds = getOutBatterIds(currentInnings.balls);
  const eligibleStrikers = getEligibleBatters(battingTeamPlayers, currentInnings.balls, selectedNonStriker?.id);
  const eligibleNonStrikers = getEligibleBatters(battingTeamPlayers, currentInnings.balls, selectedStriker?.id);

  // Eligible next batters for the dialog: exclude non-striker and all out batters
  const eligibleNextBatters = selectedNonStriker
    ? getEligibleNextBatters(battingTeamPlayers, currentInnings.balls, selectedNonStriker.id)
    : getEligibleBatters(battingTeamPlayers, currentInnings.balls, undefined);

  const inningsComplete = isInningsCompleteByOvers(currentInnings.balls, currentInnings.overs);
  const { overs, ballsInOver } = getCurrentOvers(currentInnings.balls);
  const lastOverView = getLastOverViewModel(currentInnings.balls);

  const isLegalDelivery = !isWide && !isNoBall;
  const ballsInCurrentOver = Number(currentInnings.ballsInCurrentOver);
  const isOverComplete = isLegalDelivery && ballsInCurrentOver === 5;

  // Records a ball with the given run value immediately on tap
  const handleRunTap = (runValue: number) => {
    if (!matchId || !selectedStriker || !selectedBowler) {
      toast.error('Please select striker and bowler before recording a ball');
      return;
    }

    if (inningsComplete) {
      toast.error('This innings is complete');
      return;
    }

    const success = localMatchStore.recordBall(matchId, {
      batsman: selectedStriker,
      bowler: selectedBowler,
      runs: BigInt(runValue),
      isWicket,
      extras: {
        wide: isWide,
        noBall: isNoBall,
        byes: BigInt(byes),
        legByes: BigInt(legByes),
        legalDelivery: isLegalDelivery,
      },
      previousStrikerState: selectedStriker
        ? {
            player: selectedStriker,
            runs: 0n,
            ballsFaced: 0n,
            fours: 0n,
            sixes: 0n,
            isStriker: true,
          }
        : undefined,
      previousNonStrikerState: selectedNonStriker
        ? {
            player: selectedNonStriker,
            runs: 0n,
            ballsFaced: 0n,
            fours: 0n,
            sixes: 0n,
            isStriker: false,
          }
        : undefined,
    });

    if (success) {
      setIsWicket(false);
      setIsWide(false);
      setIsNoBall(false);
      setByes(0);
      setLegByes(0);

      const currentIsOverComplete = isLegalDelivery && ballsInCurrentOver === 5;

      if (isWicket) {
        setPendingNextBatter(null);
        setShowNextBatterDialog(true);
      } else if (currentIsOverComplete) {
        setPendingNextBowler(null);
        setShowNextBowlerDialog(true);
      }

      refetchMatch();
    } else {
      toast.error('Failed to record ball');
    }
  };

  const handleUndoLastBall = () => {
    if (!matchId) return;

    undoMutation.mutate(matchId, {
      onSuccess: () => {
        setShowNextBatterDialog(false);
        refetchMatch().then(() => {
          const reloadedMatch = localMatchStore.loadMatch(matchId);
          if (reloadedMatch && reloadedMatch.innings.length > 0) {
            const reloadedInnings = reloadedMatch.innings[reloadedMatch.innings.length - 1];
            if (reloadedInnings.currentStriker) {
              setSelectedStriker(reloadedInnings.currentStriker);
            }
            if (reloadedInnings.currentNonStriker) {
              setSelectedNonStriker(reloadedInnings.currentNonStriker);
            }
          }
        });
      },
    });
  };

  const handleNextBatterConfirm = (player: Player) => {
    setSelectedStriker(player);
    setPendingNextBatter(null);
    setShowNextBatterDialog(false);
  };

  const handleNextBowlerConfirm = (bowler: Player) => {
    setSelectedBowler(bowler);
    setPendingNextBowler(null);
    setShowNextBowlerDialog(false);
  };

  const handleViewStats = () => {
    if (!matchId) return;
    navigate({ to: '/match/$matchId/stats', params: { matchId: matchId.toString() } });
  };

  const selectionsDisabled =
    !!rosterValidationError || battingTeamPlayers.length === 0 || bowlingTeamPlayers.length === 0;

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Live Scoring</span>
            <Button variant="outline" size="sm" onClick={handleViewStats}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Stats
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {rosterValidationError && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">{rosterValidationError}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Batting Team</p>
              <p className="font-semibold">{currentInnings.battingTeam.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Bowling Team</p>
              <p className="font-semibold">{currentInnings.bowlingTeam.name}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Score</p>
              <p className="text-2xl font-bold">
                {currentInnings.totalRuns.toString()}/{currentInnings.totalWickets.toString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Overs</p>
              <p className="text-2xl font-bold">
                {overs}.{ballsInOver}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={inningsComplete ? 'destructive' : 'default'}>
                {inningsComplete ? 'Complete' : 'In Progress'}
              </Badge>
            </div>
          </div>

          {lastOverView.balls.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Last Over ({lastOverView.totalRuns} runs)</p>
              <div className="flex flex-wrap gap-2">
                {lastOverView.displayTokens.map((token, idx) => (
                  <Badge key={idx} variant={token.isWicket ? 'destructive' : 'secondary'}>
                    {token.label}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <OverByOverBreakdown balls={currentInnings.balls} />

          <div className="space-y-3">
            <BatterRoleSelector
              label="Striker"
              players={eligibleStrikers}
              selectedPlayer={selectedStriker}
              onSelectPlayer={setSelectedStriker}
              disabled={selectionsDisabled || inningsComplete}
              error={selectionsDisabled ? 'Team rosters unavailable' : undefined}
            />

            <BatterRoleSelector
              label="Non-Striker"
              players={eligibleNonStrikers}
              selectedPlayer={selectedNonStriker}
              onSelectPlayer={setSelectedNonStriker}
              disabled={selectionsDisabled || inningsComplete}
              error={selectionsDisabled ? 'Team rosters unavailable' : undefined}
            />

            <BatterRoleSelector
              label="Bowler"
              players={bowlingTeamPlayers}
              selectedPlayer={selectedBowler}
              onSelectPlayer={setSelectedBowler}
              disabled={selectionsDisabled || inningsComplete}
              error={selectionsDisabled ? 'Team rosters unavailable' : undefined}
            />
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={isWicket ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => setIsWicket(!isWicket)}
                disabled={inningsComplete}
              >
                Wicket
              </Button>
              <Button
                variant={isWide ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setIsWide(!isWide)}
                disabled={inningsComplete}
              >
                Wide
              </Button>
              <Button
                variant={isNoBall ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setIsNoBall(!isNoBall)}
                disabled={inningsComplete}
              >
                No Ball
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm font-medium mb-1">Byes</p>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map((b) => (
                    <Button
                      key={b}
                      variant={byes === b ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setByes(b)}
                      disabled={inningsComplete}
                      className="flex-1"
                    >
                      {b}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Leg Byes</p>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map((lb) => (
                    <Button
                      key={lb}
                      variant={legByes === lb ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setLegByes(lb)}
                      disabled={inningsComplete}
                      className="flex-1"
                    >
                      {lb}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Tap runs to record ball</p>
              <div className="flex flex-wrap gap-2">
                {[0, 1, 2, 3, 4, 6].map((r) => (
                  <Button
                    key={r}
                    variant="default"
                    size="lg"
                    onClick={() => handleRunTap(r)}
                    disabled={inningsComplete || selectionsDisabled}
                    className="flex-1 min-w-[3rem] text-lg font-bold"
                  >
                    {r}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndoLastBall}
              disabled={undoMutation.isPending || currentInnings.balls.length === 0}
              className="flex items-center gap-2"
            >
              {undoMutation.isPending ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Undo2 className="w-4 h-4" />
              )}
              Undo
            </Button>

            {inningsComplete && (
              <Button
                variant="default"
                size="sm"
                onClick={() =>
                  navigate({
                    to: '/match/$matchId/innings-summary',
                    params: { matchId: matchId!.toString() },
                  })
                }
              >
                View Innings Summary
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <NextBatterDialog
        open={showNextBatterDialog}
        onOpenChange={setShowNextBatterDialog}
        eligibleBatters={eligibleNextBatters}
        selectedBatter={pendingNextBatter}
        onSelectBatter={setPendingNextBatter}
        onConfirm={() => {
          if (pendingNextBatter) handleNextBatterConfirm(pendingNextBatter);
        }}
      />

      <NextBowlerDialog
        open={showNextBowlerDialog}
        onOpenChange={setShowNextBowlerDialog}
        bowlers={bowlingTeamPlayers}
        selectedBowler={pendingNextBowler}
        onSelectBowler={setPendingNextBowler}
        onConfirm={() => {
          if (pendingNextBowler) handleNextBowlerConfirm(pendingNextBowler);
        }}
      />
    </div>
  );
}
