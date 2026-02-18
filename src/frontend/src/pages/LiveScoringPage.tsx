import { useState, useEffect } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useGetMatch, useRecordBall } from '../hooks/useQueries';
import { useConnectivity } from '../hooks/useConnectivity';
import { useUnsavedOfflineChangesGuard } from '../hooks/useUnsavedOfflineChangesGuard';
import { parseMatchId } from '../utils/parseMatchId';
import { formatTossInfo } from '../utils/formatTossInfo';
import { getEligibleBatters, getEligibleNextBatters } from '../utils/inningsEligibility';
import { isInningsCompleteByOvers, getCurrentOvers } from '../utils/inningsCompletion';
import { getChaseTarget, getRemainingRuns, isChaseAchieved } from '../utils/chase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { MobileSafeDialogContent } from '@/components/mobile/MobileSafeDialogContent';
import { Dialog } from '@/components/ui/dialog';
import { Select, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MobileSafeSelectContent } from '@/components/mobile/MobileSafeSelectContent';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Undo, AlertCircle, BarChart3, Target } from 'lucide-react';
import { toast } from 'sonner';
import { BatterRoleSelector } from '../components/live/BatterRoleSelector';
import { NextBatterDialog as NextBatterSelectionDialog } from '../components/live/NextBatterDialog';
import { NextBowlerDialog } from '../components/live/NextBowlerDialog';
import type { Player, Ball, BallExtras } from '../backend';

export default function LiveScoringPage() {
  const { matchId: rawMatchId } = useParams({ from: '/match/$matchId' });
  const navigate = useNavigate();
  const { isOffline } = useConnectivity();

  // Parse and validate matchId
  const parseResult = parseMatchId(rawMatchId);
  const matchId = parseResult.success ? parseResult.value : BigInt(0);
  
  const { data: match, isLoading, error } = useGetMatch(matchId);
  const recordBall = useRecordBall();

  const [striker, setStriker] = useState<Player | null>(null);
  const [nonStriker, setNonStriker] = useState<Player | null>(null);
  const [currentBowler, setCurrentBowler] = useState<Player | null>(null);
  const [ballHistory, setBallHistory] = useState<Ball[]>([]);
  const [showWicketDialog, setShowWicketDialog] = useState(false);
  const [showBowlerDialog, setShowBowlerDialog] = useState(false);
  const [showExtrasDialog, setShowExtrasDialog] = useState(false);
  const [showNextBatterDialog, setShowNextBatterDialog] = useState(false);
  const [selectedNextBatter, setSelectedNextBatter] = useState<Player | null>(null);
  const [selectedNextBowler, setSelectedNextBowler] = useState<Player | null>(null);
  const [extrasType, setExtrasType] = useState<'wide' | 'noball' | 'byes' | 'legbyes'>('wide');
  const [extrasRuns, setExtrasRuns] = useState<string>('1');
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  const [inningsEndedToastShown, setInningsEndedToastShown] = useState(false);
  const [chaseWonToastShown, setChaseWonToastShown] = useState(false);

  const currentInnings = match?.innings[match.innings.length - 1];
  const currentInningsIndex = match ? match.innings.length - 1 : 0;
  const isSecondInnings = match && match.innings.length === 2 && currentInningsIndex === 1;

  // Chase context for second innings
  const chaseTarget = match && isSecondInnings ? getChaseTarget(match) : null;
  const remainingRuns = match && isSecondInnings ? getRemainingRuns(match) : null;
  const chaseAchieved = match && isSecondInnings ? isChaseAchieved(match) : false;

  // Guard against navigation with unsaved offline changes
  useUnsavedOfflineChangesGuard(hasLocalChanges, isOffline);

  // Load ball history from current innings
  useEffect(() => {
    if (currentInnings) {
      setBallHistory(currentInnings.balls);
      
      // Restore current bowler from last ball if available
      if (currentInnings.balls.length > 0 && !currentBowler) {
        const lastBall = currentInnings.balls[currentInnings.balls.length - 1];
        setCurrentBowler(lastBall.bowler);
      }
    }
  }, [currentInnings, currentBowler]);

  // Calculate overs using legal deliveries only
  const { overs: totalOvers, ballsInOver } = getCurrentOvers(ballHistory);

  const totalRuns = ballHistory.reduce((sum, b) => sum + Number(b.runs), 0);
  const totalWickets = ballHistory.filter((b) => b.isWicket).length;

  const oversLimit = currentInnings?.overs;
  const isInningsComplete = isInningsCompleteByOvers(ballHistory, oversLimit);

  // Auto-navigate when innings completes due to overs limit
  useEffect(() => {
    if (isInningsComplete && !inningsEndedToastShown && parseResult.success) {
      setInningsEndedToastShown(true);
      toast.success('Innings ended: overs completed.');
      setTimeout(() => {
        try {
          navigate({ to: `/match/${matchId}/innings-summary` });
        } catch (navError) {
          console.error('Navigation to innings summary failed:', navError);
          toast.error('Failed to navigate to innings summary');
        }
      }, 500);
    }
  }, [isInningsComplete, inningsEndedToastShown, matchId, navigate, parseResult.success]);

  // Auto-detect chase achieved and navigate to match summary
  useEffect(() => {
    if (chaseAchieved && !chaseWonToastShown && parseResult.success && match && currentInnings) {
      setChaseWonToastShown(true);
      toast.success(`${currentInnings.battingTeam.name} won the match!`);
      setTimeout(() => {
        try {
          navigate({ to: `/match/${matchId}/summary` });
        } catch (navError) {
          console.error('Navigation to match summary failed:', navError);
          toast.error('Failed to navigate to match summary');
        }
      }, 1500);
    }
  }, [chaseAchieved, chaseWonToastShown, matchId, navigate, parseResult.success, match, currentInnings]);

  // Handle invalid matchId
  if (!parseResult.success) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8 sm:p-12 text-center">
          <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold mb-2">Invalid Match ID</h3>
          <p className="text-sm sm:text-base text-muted-foreground mb-6">{parseResult.error}</p>
          <Button onClick={() => navigate({ to: '/' })}>Back to Dashboard</Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return <div className="text-center py-12">Loading match...</div>;
  }

  if (error) {
    console.error('Match loading error:', error);
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8 sm:p-12 text-center">
          <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold mb-2">Could Not Load Match</h3>
          <p className="text-sm sm:text-base text-muted-foreground mb-6">
            {error instanceof Error ? error.message : 'Failed to load match data from this device'}
          </p>
          <Button onClick={() => navigate({ to: '/' })}>Back to Dashboard</Button>
        </CardContent>
      </Card>
    );
  }

  if (!match || !currentInnings) {
    console.error('Match or innings not found:', { match, currentInnings });
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8 sm:p-12 text-center">
          <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold mb-2">Match Not Ready</h3>
          <p className="text-sm sm:text-base text-muted-foreground mb-6">
            Unable to load match data from this device. The match may not have been created yet or the saved data may be corrupted.
          </p>
          <Button onClick={() => navigate({ to: '/' })}>Back to Dashboard</Button>
        </CardContent>
      </Card>
    );
  }

  // Check if selections are complete
  const selectionsComplete = !!striker && !!nonStriker && !!currentBowler;
  
  // Get eligible batters for striker/non-striker selection
  const eligibleForStriker = getEligibleBatters(
    currentInnings.battingTeam.players,
    ballHistory,
    nonStriker?.id
  );
  const eligibleForNonStriker = getEligibleBatters(
    currentInnings.battingTeam.players,
    ballHistory,
    striker?.id
  );

  // Get eligible next batters (excludes non-striker and out batters)
  const eligibleNextBatters = nonStriker
    ? getEligibleNextBatters(currentInnings.battingTeam.players, ballHistory, nonStriker.id)
    : [];

  // Disable scoring if innings complete, chase achieved, selections incomplete, or dialogs open
  const scoringDisabled = isInningsComplete || chaseAchieved || !selectionsComplete || showNextBatterDialog || showBowlerDialog;

  const recordBallAction = async (ball: Ball) => {
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
          setShowBowlerDialog(true);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to record ball';
      toast.error(`Ball recording failed: ${errorMessage}`);
      console.error('Ball recording failed:', error);
    }
  };

  const handleRunsClick = (runs: number) => {
    if (!striker || !currentBowler) {
      toast.error('Please select striker and bowler first');
      return;
    }
    
    const ball: Ball = {
      ballNumber: BigInt(ballHistory.length + 1),
      batsman: striker,
      bowler: currentBowler,
      runs: BigInt(runs),
      isWicket: false,
      extras: undefined,
    };
    recordBallAction(ball);
  };

  const handleWicket = () => {
    if (!striker || !currentBowler) {
      toast.error('Please select striker and bowler first');
      return;
    }
    setShowWicketDialog(true);
  };

  const confirmWicket = async () => {
    if (!striker || !currentBowler) return;

    const ball: Ball = {
      ballNumber: BigInt(ballHistory.length + 1),
      batsman: striker,
      bowler: currentBowler,
      runs: BigInt(0),
      isWicket: true,
      extras: undefined,
    };
    
    try {
      await recordBall.mutateAsync({
        matchId,
        inningsIndex: currentInningsIndex,
        ball,
      });
      
      const updatedHistory = [...ballHistory, ball];
      setBallHistory(updatedHistory);
      setHasLocalChanges(isOffline);
      setShowWicketDialog(false);

      // Clear striker
      setStriker(null);
      setSelectedNextBatter(null);
      
      // Check if there are eligible batters
      const eligible = nonStriker
        ? getEligibleNextBatters(currentInnings.battingTeam.players, updatedHistory, nonStriker.id)
        : [];
      
      if (eligible.length === 0) {
        // All out - automatically end innings
        toast.success('Innings ended: all out.');
        try {
          navigate({ to: `/match/${matchId}/innings-summary` });
        } catch (navError) {
          console.error('Navigation to innings summary failed:', navError);
          toast.error('Failed to navigate to innings summary');
        }
      } else {
        // Show next batter selection
        setShowNextBatterDialog(true);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to record wicket';
      toast.error(`Wicket recording failed: ${errorMessage}`);
      console.error('Wicket recording failed:', error);
    }
  };

  const confirmNextBatter = (batter: Player) => {
    setStriker(batter);
    setShowNextBatterDialog(false);
    setSelectedNextBatter(null);
  };

  const handleExtras = () => {
    if (!striker || !currentBowler) {
      toast.error('Please select striker and bowler first');
      return;
    }
    setShowExtrasDialog(true);
  };

  const confirmExtras = () => {
    if (!striker || !currentBowler) return;

    const runs = Number(extrasRuns) || 1;
    let extras: BallExtras;

    if (extrasType === 'wide') {
      extras = {
        wide: true,
        noBall: false,
        byes: BigInt(0),
        legByes: BigInt(0),
        legalDelivery: false,
      };
    } else if (extrasType === 'noball') {
      extras = {
        wide: false,
        noBall: true,
        byes: BigInt(0),
        legByes: BigInt(0),
        legalDelivery: false,
      };
    } else if (extrasType === 'byes') {
      extras = {
        wide: false,
        noBall: false,
        byes: BigInt(runs),
        legByes: BigInt(0),
        legalDelivery: true,
      };
    } else {
      // legbyes
      extras = {
        wide: false,
        noBall: false,
        byes: BigInt(0),
        legByes: BigInt(runs),
        legalDelivery: true,
      };
    }

    const ball: Ball = {
      ballNumber: BigInt(ballHistory.length + 1),
      batsman: striker,
      bowler: currentBowler,
      runs: BigInt(runs),
      isWicket: false,
      extras,
    };
    recordBallAction(ball);
    setShowExtrasDialog(false);
    setExtrasRuns('1');
  };

  const confirmNewBowler = (bowler: Player) => {
    setCurrentBowler(bowler);
    setShowBowlerDialog(false);
    setSelectedNextBowler(null);
  };

  const handleUndo = () => {
    if (ballHistory.length === 0) return;

    const lastBall = ballHistory[ballHistory.length - 1];
    const updatedHistory = ballHistory.slice(0, -1);
    setBallHistory(updatedHistory);

    // Reverse strike rotation if odd runs
    if (Number(lastBall.runs) % 2 === 1) {
      const temp = striker;
      setStriker(nonStriker);
      setNonStriker(temp);
    }

    toast.success('Last ball undone');
  };

  const handleEndInnings = () => {
    try {
      navigate({ to: `/match/${matchId}/innings-summary` });
    } catch (error) {
      console.error('Navigation to innings summary failed:', error);
      toast.error('Failed to navigate to innings summary');
    }
  };

  const handleViewStats = () => {
    try {
      navigate({ to: `/match/${matchId}/stats` });
    } catch (error) {
      console.error('Navigation to statistics failed:', error);
      toast.error('Failed to navigate to statistics');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
            <span className="text-base sm:text-lg break-words">
              {currentInnings.battingTeam.name} vs {currentInnings.bowlingTeam.name}
            </span>
            <Badge variant={isInningsComplete || chaseAchieved ? 'destructive' : 'default'} className="self-start sm:self-auto">
              {chaseAchieved ? 'Match Won' : isInningsComplete ? 'Innings Complete' : 'Live'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-2">
            <div className="text-4xl sm:text-5xl font-bold">
              {totalRuns}/{totalWickets}
            </div>
            <div className="text-xl sm:text-2xl text-muted-foreground">
              {totalOvers}.{ballsInOver} Overs
              {oversLimit && ` / ${oversLimit}`}
            </div>
            {isSecondInnings && chaseTarget !== null && (
              <div className="pt-3 space-y-1">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Target className="h-4 w-4" />
                  <span>Target: {chaseTarget}</span>
                </div>
                {remainingRuns !== null && remainingRuns > 0 && (
                  <div className="text-base font-semibold text-primary">
                    Need {remainingRuns} more run{remainingRuns === 1 ? '' : 's'} to win
                  </div>
                )}
                {remainingRuns === 0 && (
                  <div className="text-base font-semibold text-green-600">
                    Target achieved!
                  </div>
                )}
              </div>
            )}
            <div className="text-sm text-muted-foreground pt-2 break-words">
              {formatTossInfo(match)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chase Won Message */}
      {chaseAchieved && (
        <Card className="border-green-600">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-green-600 shrink-0" />
              <div>
                <p className="font-semibold text-green-600">Match Won!</p>
                <p className="text-sm text-muted-foreground">
                  {currentInnings.battingTeam.name} has successfully chased the target. No more balls can be recorded.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Innings Complete Message */}
      {isInningsComplete && !chaseAchieved && (
        <Card className="border-destructive">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <p className="font-semibold text-destructive">Innings Complete</p>
                <p className="text-sm text-muted-foreground">
                  The innings has ended after {oversLimit} overs. No more balls can be recorded.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batter Selection */}
      {!selectionsComplete && !isInningsComplete && !chaseAchieved && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-sm sm:text-base">Select Batters and Bowler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please select the striker, non-striker, and current bowler to begin scoring.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <BatterRoleSelector
                label="Striker"
                value={striker}
                onChange={setStriker}
                players={eligibleForStriker}
                placeholder="Select striker"
              />
              <BatterRoleSelector
                label="Non-Striker"
                value={nonStriker}
                onChange={setNonStriker}
                players={eligibleForNonStriker}
                placeholder="Select non-striker"
              />
            </div>
            <div className="space-y-2">
              <Label>Current Bowler</Label>
              <Select
                value={currentBowler?.id.toString() || ''}
                onValueChange={(id) => {
                  const bowler = currentInnings.bowlingTeam.players.find((p) => p.id.toString() === id);
                  if (bowler) setCurrentBowler(bowler);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select bowler from roster" />
                </SelectTrigger>
                <MobileSafeSelectContent>
                  {currentInnings.bowlingTeam.players.map((player) => (
                    <SelectItem key={player.id.toString()} value={player.id.toString()}>
                      {player.name}
                    </SelectItem>
                  ))}
                </MobileSafeSelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Players */}
      {selectionsComplete && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm sm:text-base">Current Players</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Striker:</span>
              <span className="font-medium break-words text-right">{striker?.name}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Non-Striker:</span>
              <span className="font-medium break-words text-right">{nonStriker?.name}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Bowler:</span>
              <span className="font-medium break-words text-right">{currentBowler?.name}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scoring Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm sm:text-base">Record Ball</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {[0, 1, 2, 3, 4, 6].map((runs) => (
              <Button
                key={runs}
                onClick={() => handleRunsClick(runs)}
                disabled={scoringDisabled}
                size="lg"
                className="h-14 sm:h-16 text-lg sm:text-xl font-bold touch-manipulation"
              >
                {runs}
              </Button>
            ))}
            <Button
              onClick={handleWicket}
              disabled={scoringDisabled}
              variant="destructive"
              size="lg"
              className="h-14 sm:h-16 text-base sm:text-lg font-bold touch-manipulation"
            >
              W
            </Button>
            <Button
              onClick={handleExtras}
              disabled={scoringDisabled}
              variant="outline"
              size="lg"
              className="h-14 sm:h-16 text-base sm:text-lg font-bold touch-manipulation"
            >
              Extras
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleUndo}
              disabled={ballHistory.length === 0 || isInningsComplete || chaseAchieved}
              variant="outline"
              className="flex-1 touch-manipulation"
              size="lg"
            >
              <Undo className="h-4 w-4 mr-2" />
              Undo
            </Button>
            <Button
              onClick={handleViewStats}
              variant="outline"
              className="flex-1 touch-manipulation"
              size="lg"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Stats
            </Button>
          </div>
          {!isInningsComplete && !chaseAchieved && (
            <Button
              onClick={handleEndInnings}
              variant="secondary"
              className="w-full touch-manipulation"
              size="lg"
            >
              End Innings
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Wicket Confirmation Dialog */}
      <Dialog open={showWicketDialog} onOpenChange={setShowWicketDialog}>
        <MobileSafeDialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Wicket</DialogTitle>
            <DialogDescription>
              Record a wicket for {striker?.name}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowWicketDialog(false)} className="touch-manipulation">
              Cancel
            </Button>
            <Button onClick={confirmWicket} variant="destructive" className="touch-manipulation">
              Confirm Wicket
            </Button>
          </DialogFooter>
        </MobileSafeDialogContent>
      </Dialog>

      {/* Next Batter Dialog */}
      <NextBatterSelectionDialog
        open={showNextBatterDialog}
        onOpenChange={setShowNextBatterDialog}
        eligibleBatters={eligibleNextBatters}
        onConfirm={confirmNextBatter}
        selectedBatter={selectedNextBatter}
        onSelectBatter={setSelectedNextBatter}
      />

      {/* Next Bowler Dialog */}
      <NextBowlerDialog
        open={showBowlerDialog}
        onOpenChange={setShowBowlerDialog}
        bowlers={currentInnings.bowlingTeam.players}
        onConfirm={confirmNewBowler}
        selectedBowler={selectedNextBowler}
        onSelectBowler={setSelectedNextBowler}
      />

      {/* Extras Dialog */}
      <Dialog open={showExtrasDialog} onOpenChange={setShowExtrasDialog}>
        <MobileSafeDialogContent>
          <DialogHeader>
            <DialogTitle>Record Extras</DialogTitle>
            <DialogDescription>
              Select the type of extras and runs
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Extras Type</Label>
              <Select value={extrasType} onValueChange={(v) => setExtrasType(v as typeof extrasType)}>
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
                min="0"
                value={extrasRuns}
                onChange={(e) => setExtrasRuns(e.target.value)}
                className="touch-manipulation"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowExtrasDialog(false)} className="touch-manipulation">
              Cancel
            </Button>
            <Button onClick={confirmExtras} className="touch-manipulation">
              Confirm
            </Button>
          </DialogFooter>
        </MobileSafeDialogContent>
      </Dialog>
    </div>
  );
}
