import { useParams, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useGetMatch, useRecordBall, useUndoLastBall } from '../hooks/useQueries';
import { useConnectivity } from '../hooks/useConnectivity';
import { useUnsavedOfflineChangesGuard } from '../hooks/useUnsavedOfflineChangesGuard';
import { parseMatchId } from '../utils/parseMatchId';
import { loadLocalMatch } from '../offline/localMatchStore';
import { ensureMatchInitialized } from '../utils/ensureMatchInitialized';
import type { Match, Player, Ball, BallExtras } from '../backend';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectItem } from '@/components/ui/select';
import { MobileSafeSelectContent } from '@/components/mobile/MobileSafeSelectContent';
import { AlertCircle, ArrowLeft, BarChart3, Undo2 } from 'lucide-react';
import BatterRoleSelector from '../components/live/BatterRoleSelector';
import { NextBatterDialog } from '../components/live/NextBatterDialog';
import { NextBowlerDialog } from '../components/live/NextBowlerDialog';
import { OverByOverBreakdown } from '../components/live/OverByOverBreakdown';
import { getEligibleBatters, getEligibleNextBatters } from '../utils/inningsEligibility';
import { isInningsCompleteByOvers, getCurrentOvers } from '../utils/inningsCompletion';
import { getLastOverViewModel } from '../utils/lastOver';
import { getChaseTarget, getRemainingRuns, isChaseAchieved } from '../utils/chase';
import { formatTossInfo } from '../utils/formatTossInfo';
import { toast } from 'sonner';

export default function LiveScoringPage() {
  const { matchId: matchIdParam } = useParams({ from: '/match/$matchId' });
  const navigate = useNavigate();
  const { isOffline } = useConnectivity();

  const parsedId = parseMatchId(matchIdParam);
  const matchId = parsedId.success ? parsedId.value : null;

  const { data: backendMatch, isLoading: backendLoading, error: backendError } = useGetMatch(matchId || 0n);
  const recordBall = useRecordBall();
  const undoLastBallMutation = useUndoLastBall();

  const [localMatch, setLocalMatch] = useState<Match | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Scoring state
  const [striker, setStriker] = useState<Player | null>(null);
  const [nonStriker, setNonStriker] = useState<Player | null>(null);
  const [bowler, setBowler] = useState<Player | null>(null);
  const [ballHistory, setBallHistory] = useState<Ball[]>([]);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);

  // Dialog state
  const [showNextBatterDialog, setShowNextBatterDialog] = useState(false);
  const [showNextBowlerDialog, setShowNextBowlerDialog] = useState(false);
  const [showExtrasDialog, setShowExtrasDialog] = useState(false);
  const [selectedNextBatter, setSelectedNextBatter] = useState<Player | null>(null);
  const [selectedNextBowler, setSelectedNextBowler] = useState<Player | null>(null);

  // Extras state
  const [extrasType, setExtrasType] = useState<'wide' | 'noball' | 'byes' | 'legbyes'>('wide');
  const [extrasRuns, setExtrasRuns] = useState<string>('1');

  // Load local match on mount and when matchId changes
  useEffect(() => {
    if (!matchId) return;
    try {
      const stored = loadLocalMatch(matchId);
      if (stored) {
        const initialized = ensureMatchInitialized(stored);
        setLocalMatch(initialized);
      }
    } catch (err) {
      console.error('Failed to load local match:', err);
      setLoadError('Failed to load match from local storage. Please try refreshing the page.');
    }
  }, [matchId]);

  // Sync backend match to local storage when it loads
  useEffect(() => {
    if (backendMatch && matchId) {
      try {
        const initialized = ensureMatchInitialized(backendMatch);
        setLocalMatch(initialized);
      } catch (err) {
        console.error('Failed to sync backend match:', err);
      }
    }
  }, [backendMatch, matchId]);

  const match = localMatch || backendMatch;

  // Load ball history and restore player selections from current innings
  useEffect(() => {
    if (match && match.innings.length > 0) {
      const currentInnings = match.innings[match.innings.length - 1];
      setBallHistory(currentInnings.balls);

      // Restore current bowler from last ball if not already set
      if (currentInnings.balls.length > 0 && !bowler) {
        const lastBall = currentInnings.balls[currentInnings.balls.length - 1];
        setBowler(lastBall.bowler);
      }

      // Restore striker and non-striker from ball history
      // Find the last two unique batsmen who are not out
      if (currentInnings.balls.length > 0 && (!striker || !nonStriker)) {
        const outBatterIds = new Set<bigint>();
        currentInnings.balls.forEach(ball => {
          if (ball.isWicket) {
            outBatterIds.add(ball.batsman.id);
          }
        });

        // Find last two batsmen who are not out
        const recentBatsmen: Player[] = [];
        for (let i = currentInnings.balls.length - 1; i >= 0 && recentBatsmen.length < 2; i--) {
          const ball = currentInnings.balls[i];
          if (!outBatterIds.has(ball.batsman.id)) {
            const alreadyAdded = recentBatsmen.some(b => b.id === ball.batsman.id);
            if (!alreadyAdded) {
              recentBatsmen.push(ball.batsman);
            }
          }
        }

        // Set striker and non-striker if we found them and they're not already set
        if (recentBatsmen.length >= 1 && !striker) {
          setStriker(recentBatsmen[0]);
        }
        if (recentBatsmen.length >= 2 && !nonStriker) {
          setNonStriker(recentBatsmen[1]);
        }
      }
    }
  }, [match, bowler, striker, nonStriker]);

  // Guard against navigation with unsaved offline changes
  useUnsavedOfflineChangesGuard(hasLocalChanges, isOffline);

  // Guard: Invalid match ID
  if (!parsedId.success) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Invalid match ID. Please return to the dashboard and select a valid match.
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate({ to: '/' })} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  // Guard: Loading state
  if (backendLoading && !localMatch) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="text-center py-8">Loading match data...</div>
      </div>
    );
  }

  // Guard: Load error
  if (loadError) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
        <Button onClick={() => navigate({ to: '/' })} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  // Guard: Backend error (but allow if we have local match)
  if (backendError && !localMatch) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load match from backend. Error: {backendError.message}
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate({ to: '/' })} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  // Guard: No match data
  if (!match) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Match not found. Please return to the dashboard and try again.
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate({ to: '/' })} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  // Guard: No innings
  if (!match.innings || match.innings.length === 0) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This match has no innings initialized. Please return to the dashboard and recreate the match with proper toss information.
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate({ to: '/' })} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const currentInnings = match.innings[match.innings.length - 1];
  const currentInningsIndex = match.innings.length - 1;
  const isSecondInnings = match.innings.length === 2 && currentInningsIndex === 1;

  // Guard: Incomplete innings data
  if (!currentInnings.battingTeam || !currentInnings.bowlingTeam) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Innings data is incomplete. Please return to the dashboard and recreate the match.
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate({ to: '/' })} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  // Guard: Empty rosters
  const battingPlayers = currentInnings.battingTeam.players || [];
  const bowlingPlayers = currentInnings.bowlingTeam.players || [];

  if (battingPlayers.length === 0 || bowlingPlayers.length === 0) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Team rosters are empty. Please return to the dashboard and ensure both teams have players before starting the match.
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate({ to: '/' })} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  // Calculate eligible batters
  const eligibleForStriker = getEligibleBatters(
    battingPlayers,
    ballHistory,
    nonStriker?.id
  );
  const eligibleForNonStriker = getEligibleBatters(
    battingPlayers,
    ballHistory,
    striker?.id
  );
  const eligibleNextBatters = nonStriker
    ? getEligibleNextBatters(battingPlayers, ballHistory, nonStriker.id)
    : [];

  // Calculate overs and innings completion
  const { overs, ballsInOver } = getCurrentOvers(ballHistory);
  const totalRuns = ballHistory.reduce((sum, b) => sum + Number(b.runs), 0);
  const totalWickets = ballHistory.filter((b) => b.isWicket).length;
  const isInningsComplete = isInningsCompleteByOvers(ballHistory, currentInnings.overs);

  // Chase context for second innings
  const chaseTarget = match && isSecondInnings ? getChaseTarget(match) : null;
  const remainingRuns = match && isSecondInnings ? getRemainingRuns(match) : null;
  const chaseAchieved = match && isSecondInnings ? isChaseAchieved(match) : false;

  // Last over view model
  const lastOverData = getLastOverViewModel(ballHistory);

  // Check if selections are complete
  const selectionsComplete = !!striker && !!nonStriker && !!bowler;
  const scoringDisabled = isInningsComplete || chaseAchieved || !selectionsComplete || showNextBatterDialog || showNextBowlerDialog;

  const handleUndoLastBall = () => {
    if (!matchId || ballHistory.length === 0) return;
    undoLastBallMutation.mutate({ matchId });
  };

  const recordBallAction = async (ball: Ball) => {
    if (!matchId) return;

    // Prevent recording if innings is already complete or chase achieved
    if (isInningsComplete) {
      toast.error('Cannot record ball: innings is complete');
      return;
    }
    if (chaseAchieved) {
      toast.error('Cannot record ball: match is won');
      return;
    }

    try {
      await recordBall.mutateAsync({
        matchId,
        inningsIndex: currentInningsIndex,
        ball,
      });

      const updatedHistory = [...ballHistory, ball];
      setBallHistory(updatedHistory);
      setHasLocalChanges(isOffline);

      // Rotate strike if odd runs
      if (Number(ball.runs) % 2 === 1) {
        const temp = striker;
        setStriker(nonStriker);
        setNonStriker(temp);
      }

      // Check if over is complete (legal delivery and 6 balls in over)
      const isLegalDelivery = ball.extras ? ball.extras.legalDelivery : true;
      if (isLegalDelivery) {
        const newOversState = getCurrentOvers(updatedHistory);
        if (newOversState.ballsInOver === 0 && newOversState.overs > 0) {
          // Over complete - swap strike and prompt for new bowler
          const temp = striker;
          setStriker(nonStriker);
          setNonStriker(temp);
          setSelectedNextBowler(null);
          setShowNextBowlerDialog(true);
        }
      }

      // Check if innings is now complete
      if (isInningsCompleteByOvers(updatedHistory, currentInnings.overs)) {
        toast.success('Innings ended: overs completed.');
        setTimeout(() => {
          navigate({ to: `/match/${matchId}/innings-summary` });
        }, 500);
      }

      // Check if chase is achieved
      if (isSecondInnings) {
        const newTotalRuns = updatedHistory.reduce((sum, b) => sum + Number(b.runs), 0);
        if (chaseTarget && newTotalRuns > chaseTarget) {
          toast.success(`${currentInnings.battingTeam.name} won the match!`);
          setTimeout(() => {
            navigate({ to: `/match/${matchId}/summary` });
          }, 1500);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to record ball';
      toast.error(`Ball recording failed: ${errorMessage}`);
      console.error('Ball recording failed:', error);
    }
  };

  const handleRunsClick = (runs: number) => {
    if (!striker || !bowler) {
      toast.error('Please select striker and bowler first');
      return;
    }

    const ball: Ball = {
      ballNumber: BigInt(ballHistory.length + 1),
      batsman: striker,
      bowler: bowler,
      runs: BigInt(runs),
      isWicket: false,
      extras: undefined,
    };
    recordBallAction(ball);
  };

  const handleWicket = () => {
    if (!striker || !bowler) {
      toast.error('Please select striker and bowler first');
      return;
    }

    const ball: Ball = {
      ballNumber: BigInt(ballHistory.length + 1),
      batsman: striker,
      bowler: bowler,
      runs: BigInt(0),
      isWicket: true,
      extras: undefined,
    };

    recordBallAction(ball).then(() => {
      // Clear striker
      setStriker(null);
      setSelectedNextBatter(null);

      // Check if there are eligible batters
      const updatedHistory = [...ballHistory, ball];
      const eligible = nonStriker
        ? getEligibleNextBatters(battingPlayers, updatedHistory, nonStriker.id)
        : [];

      if (eligible.length === 0) {
        // All out - automatically end innings and navigate to innings summary
        toast.success('Innings ended: all out.');
        setTimeout(() => {
          if (matchId) {
            navigate({ to: `/match/${matchId}/innings-summary` });
          }
        }, 500);
      } else {
        // Show next batter selection
        setShowNextBatterDialog(true);
      }
    });
  };

  const confirmNextBatter = (batter: Player) => {
    setStriker(batter);
    setShowNextBatterDialog(false);
    setSelectedNextBatter(null);
  };

  const confirmNextBowler = (newBowler: Player) => {
    setBowler(newBowler);
    setShowNextBowlerDialog(false);
    setSelectedNextBowler(null);
  };

  const handleExtras = () => {
    if (!striker || !bowler) {
      toast.error('Please select striker and bowler first');
      return;
    }
    setShowExtrasDialog(true);
  };

  const confirmExtras = () => {
    if (!striker || !bowler) return;

    const runs = Number(extrasRuns) || 1;
    let extras: BallExtras;

    if (extrasType === 'wide') {
      extras = {
        wide: true,
        noBall: false,
        byes: 0n,
        legByes: 0n,
        legalDelivery: false,
      };
    } else if (extrasType === 'noball') {
      extras = {
        wide: false,
        noBall: true,
        byes: 0n,
        legByes: 0n,
        legalDelivery: false,
      };
    } else if (extrasType === 'byes') {
      extras = {
        wide: false,
        noBall: false,
        byes: BigInt(runs),
        legByes: 0n,
        legalDelivery: true,
      };
    } else {
      // legbyes
      extras = {
        wide: false,
        noBall: false,
        byes: 0n,
        legByes: BigInt(runs),
        legalDelivery: true,
      };
    }

    const ball: Ball = {
      ballNumber: BigInt(ballHistory.length + 1),
      batsman: striker,
      bowler: bowler,
      runs: BigInt(runs),
      isWicket: false,
      extras,
    };
    recordBallAction(ball);
    setShowExtrasDialog(false);
    setExtrasRuns('1');
  };

  // Check if selectors should be disabled
  const selectorsDisabled = battingPlayers.length === 0 || bowlingPlayers.length === 0;

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/' })}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate({ to: `/match/${matchId}/stats` })}>
          <BarChart3 className="mr-2 h-4 w-4" />
          Stats
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {currentInnings.battingTeam.name} vs {currentInnings.bowlingTeam.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-4xl font-bold">
                {totalRuns}/{totalWickets}
              </div>
              <div className="text-sm text-muted-foreground">
                Overs: {overs}.{ballsInOver}
                {currentInnings.overs && ` / ${currentInnings.overs}`}
              </div>
            </div>
            {isInningsComplete && (
              <Badge variant="secondary">Innings Complete</Badge>
            )}
            {chaseAchieved && (
              <Badge variant="default">Match Won!</Badge>
            )}
          </div>

          {isSecondInnings && chaseTarget && (
            <div className="text-sm">
              <div>Target: {chaseTarget + 1}</div>
              {remainingRuns !== null && remainingRuns > 0 && (
                <div>Need {remainingRuns} runs to win</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {!isInningsComplete && !chaseAchieved && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Player Selection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <BatterRoleSelector
                label="Striker"
                players={eligibleForStriker}
                selectedPlayer={striker}
                onSelectPlayer={setStriker}
                disabled={selectorsDisabled}
              />
              <BatterRoleSelector
                label="Non-Striker"
                players={eligibleForNonStriker}
                selectedPlayer={nonStriker}
                onSelectPlayer={setNonStriker}
                disabled={selectorsDisabled}
              />
              <div className="space-y-2">
                <Label>Bowler</Label>
                <Select
                  value={bowler?.id.toString() || ''}
                  onValueChange={(value) => {
                    const selected = bowlingPlayers.find(p => p.id.toString() === value);
                    if (selected) setBowler(selected);
                  }}
                  disabled={selectorsDisabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select bowler..." />
                  </SelectTrigger>
                  <MobileSafeSelectContent>
                    {bowlingPlayers.map((player) => (
                      <SelectItem key={player.id.toString()} value={player.id.toString()}>
                        {player.name}
                      </SelectItem>
                    ))}
                  </MobileSafeSelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Score Ball</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3, 4, 6].map((runs) => (
                  <Button
                    key={runs}
                    onClick={() => handleRunsClick(runs)}
                    disabled={scoringDisabled}
                    variant="outline"
                  >
                    {runs}
                  </Button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handleWicket}
                  disabled={scoringDisabled}
                  variant="destructive"
                >
                  Wicket
                </Button>
                <Button
                  onClick={handleExtras}
                  disabled={scoringDisabled}
                  variant="secondary"
                >
                  Extras
                </Button>
              </div>

              <Button
                onClick={handleUndoLastBall}
                disabled={ballHistory.length === 0 || undoLastBallMutation.isPending}
                variant="outline"
                className="w-full"
              >
                <Undo2 className="mr-2 h-4 w-4" />
                {undoLastBallMutation.isPending ? 'Undoing...' : 'Undo Last Ball'}
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      <OverByOverBreakdown balls={ballHistory} />

      <NextBatterDialog
        open={showNextBatterDialog}
        onOpenChange={setShowNextBatterDialog}
        eligibleBatters={eligibleNextBatters}
        onConfirm={confirmNextBatter}
        selectedBatter={selectedNextBatter}
        onSelectBatter={setSelectedNextBatter}
      />

      <NextBowlerDialog
        open={showNextBowlerDialog}
        onOpenChange={setShowNextBowlerDialog}
        bowlers={bowlingPlayers}
        onConfirm={confirmNextBowler}
        selectedBowler={selectedNextBowler}
        onSelectBowler={setSelectedNextBowler}
      />

      <Dialog open={showExtrasDialog} onOpenChange={setShowExtrasDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Extras</DialogTitle>
            <DialogDescription>Select the type of extras and runs</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Extras Type</Label>
              <Select value={extrasType} onValueChange={(v: any) => setExtrasType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <MobileSafeSelectContent>
                  <SelectItem value="wide">Wide</SelectItem>
                  <SelectItem value="noball">No Ball</SelectItem>
                  <SelectItem value="byes">Byes</SelectItem>
                  <SelectItem value="legbyes">Leg Byes</SelectItem>
                </MobileSafeSelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Runs</Label>
              <Input
                type="number"
                min="1"
                value={extrasRuns}
                onChange={(e) => setExtrasRuns(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExtrasDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmExtras}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
