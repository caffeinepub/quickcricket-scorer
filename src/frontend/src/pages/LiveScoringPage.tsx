import { useState, useEffect } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useGetMatch, useRecordBall } from '../hooks/useQueries';
import { useConnectivity } from '../hooks/useConnectivity';
import { useUnsavedOfflineChangesGuard } from '../hooks/useUnsavedOfflineChangesGuard';
import { parseMatchId } from '../utils/parseMatchId';
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
import { Undo, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Player, Ball, BallExtras } from '../backend';

export default function LiveScoringPage() {
  const { matchId: rawMatchId } = useParams({ from: '/match/$matchId' });
  const navigate = useNavigate();
  const { isOffline } = useConnectivity();

  // Parse and validate matchId
  const parseResult = parseMatchId(rawMatchId);
  
  const { data: match, isLoading, error } = useGetMatch(parseResult.success ? parseResult.value : BigInt(0));
  const recordBall = useRecordBall();

  const [striker, setStriker] = useState<Player | null>(null);
  const [nonStriker, setNonStriker] = useState<Player | null>(null);
  const [currentBowler, setCurrentBowler] = useState<Player | null>(null);
  const [ballHistory, setBallHistory] = useState<Ball[]>([]);
  const [showWicketDialog, setShowWicketDialog] = useState(false);
  const [showBowlerDialog, setShowBowlerDialog] = useState(false);
  const [showExtrasDialog, setShowExtrasDialog] = useState(false);
  const [extrasType, setExtrasType] = useState<'wide' | 'noball' | 'byes' | 'legbyes'>('wide');
  const [extrasRuns, setExtrasRuns] = useState<string>('1');
  const [nextBowlerName, setNextBowlerName] = useState('');
  const [hasLocalChanges, setHasLocalChanges] = useState(false);

  const currentInnings = match?.innings[match.innings.length - 1];
  const currentInningsIndex = match ? match.innings.length - 1 : 0;
  const matchId = parseResult.success ? parseResult.value : BigInt(0);

  // Guard against navigation with unsaved offline changes
  useUnsavedOfflineChangesGuard(hasLocalChanges, isOffline);

  // Initialize players - must be called before any conditional returns
  useEffect(() => {
    if (currentInnings && !striker && !nonStriker && !currentBowler) {
      // Initialize with first two batters and first bowler
      const batters = currentInnings.battingTeam.players;
      const bowlers = currentInnings.bowlingTeam.players;
      if (batters.length >= 2) {
        setStriker(batters[0]);
        setNonStriker(batters[1]);
      }
      if (bowlers.length >= 1) {
        setCurrentBowler(bowlers[0]);
      }
      setBallHistory(currentInnings.balls);
    }
  }, [currentInnings, striker, nonStriker, currentBowler]);

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

  // Wait for UI state to initialize
  if (!striker || !nonStriker || !currentBowler) {
    return <div className="text-center py-12">Initializing match...</div>;
  }

  // Calculate legal balls only
  const legalBalls = ballHistory.filter((b) => (b.extras ? b.extras.legalDelivery : true));
  const totalOvers = Math.floor(legalBalls.length / 6);
  const ballsInOver = legalBalls.length % 6;

  const totalRuns = ballHistory.reduce((sum, b) => sum + Number(b.runs), 0);
  const totalWickets = ballHistory.filter((b) => b.isWicket).length;

  const oversLimit = currentInnings.overs ? Number(currentInnings.overs) : null;
  const isInningsComplete = oversLimit !== null && totalOvers >= oversLimit;

  const recordBallAction = async (ball: Ball) => {
    try {
      await recordBall.mutateAsync({
        matchId,
        inningsIndex: currentInningsIndex,
        ball,
      });
      setBallHistory([...ballHistory, ball]);
      setHasLocalChanges(isOffline);

      // Rotate strike if odd runs
      if (Number(ball.runs) % 2 === 1) {
        const temp = striker;
        setStriker(nonStriker);
        setNonStriker(temp);
      }

      // Check if over is complete (legal delivery and 6 balls)
      const isLegalDelivery = ball.extras ? ball.extras.legalDelivery : true;
      if (isLegalDelivery && (ballsInOver + 1) % 6 === 0) {
        // Over complete - swap strike and prompt for new bowler
        const temp = striker;
        setStriker(nonStriker);
        setNonStriker(temp);
        setShowBowlerDialog(true);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to record ball';
      toast.error(`Ball recording failed: ${errorMessage}`);
      console.error('Ball recording failed:', error);
    }
  };

  const handleRunsClick = (runs: number) => {
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
    setShowWicketDialog(true);
  };

  const confirmWicket = () => {
    const ball: Ball = {
      ballNumber: BigInt(ballHistory.length + 1),
      batsman: striker,
      bowler: currentBowler,
      runs: BigInt(0),
      isWicket: true,
      extras: undefined,
    };
    recordBallAction(ball);
    setShowWicketDialog(false);

    // Replace striker with next batter
    const remainingBatters = currentInnings.battingTeam.players.filter(
      (p) => p.id !== striker.id && p.id !== nonStriker.id && !ballHistory.some((b) => b.isWicket && b.batsman.id === p.id)
    );
    if (remainingBatters.length > 0) {
      setStriker(remainingBatters[0]);
    }
  };

  const handleExtras = () => {
    setShowExtrasDialog(true);
  };

  const confirmExtras = () => {
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

  const confirmNewBowler = () => {
    if (!nextBowlerName.trim()) {
      toast.error('Please enter bowler name');
      return;
    }

    // Find or create bowler
    let bowler = currentInnings.bowlingTeam.players.find((p) => p.name === nextBowlerName.trim());
    if (!bowler) {
      const maxId = Math.max(...currentInnings.bowlingTeam.players.map((p) => Number(p.id)));
      bowler = {
        id: BigInt(maxId + 1),
        name: nextBowlerName.trim(),
        battingOrderPosition: undefined,
      };
    }

    setCurrentBowler(bowler);
    setShowBowlerDialog(false);
    setNextBowlerName('');
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

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
            <span className="text-base sm:text-lg break-words">
              {currentInnings.battingTeam.name} vs {currentInnings.bowlingTeam.name}
            </span>
            <Badge variant={isInningsComplete ? 'destructive' : 'default'} className="self-start sm:self-auto">
              {isInningsComplete ? 'Innings Complete' : 'Live'}
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
          </div>
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm sm:text-base">On Strike</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base sm:text-xl font-semibold break-words">{striker.name}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm sm:text-base">Non-Striker</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base sm:text-xl font-semibold break-words">{nonStriker.name}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm sm:text-base break-words">Bowling: {currentBowler.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {[0, 1, 2, 3, 4, 6].map((runs) => (
              <Button
                key={runs}
                size="lg"
                onClick={() => handleRunsClick(runs)}
                disabled={recordBall.isPending || isInningsComplete}
                className="h-14 sm:h-16 text-lg sm:text-xl touch-manipulation"
              >
                {runs}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="destructive"
              onClick={handleWicket}
              disabled={recordBall.isPending || isInningsComplete}
              className="touch-manipulation"
              size="default"
            >
              Wicket
            </Button>
            <Button
              variant="outline"
              onClick={handleExtras}
              disabled={recordBall.isPending || isInningsComplete}
              className="touch-manipulation"
              size="default"
            >
              Extras
            </Button>
            <Button 
              variant="outline" 
              onClick={handleUndo} 
              disabled={ballHistory.length === 0 || recordBall.isPending}
              className="touch-manipulation"
              size="default"
            >
              <Undo className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Undo</span>
              <span className="sm:hidden">Undo</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {isInningsComplete && (
        <Button onClick={handleEndInnings} size="lg" className="w-full">
          End Innings
        </Button>
      )}

      {/* Wicket Dialog */}
      <Dialog open={showWicketDialog} onOpenChange={setShowWicketDialog}>
        <MobileSafeDialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Wicket</DialogTitle>
            <DialogDescription>
              Record a wicket for {striker.name}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowWicketDialog(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={confirmWicket} variant="destructive" className="w-full sm:w-auto">
              Confirm Wicket
            </Button>
          </DialogFooter>
        </MobileSafeDialogContent>
      </Dialog>

      {/* Extras Dialog */}
      <Dialog open={showExtrasDialog} onOpenChange={setShowExtrasDialog}>
        <MobileSafeDialogContent>
          <DialogHeader>
            <DialogTitle>Record Extras</DialogTitle>
            <DialogDescription>Select the type of extra and runs</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Extra Type</Label>
              <Select value={extrasType} onValueChange={(v) => setExtrasType(v as any)}>
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
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowExtrasDialog(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={confirmExtras} className="w-full sm:w-auto">
              Record Extras
            </Button>
          </DialogFooter>
        </MobileSafeDialogContent>
      </Dialog>

      {/* New Bowler Dialog */}
      <Dialog open={showBowlerDialog} onOpenChange={setShowBowlerDialog}>
        <MobileSafeDialogContent>
          <DialogHeader>
            <DialogTitle>New Bowler</DialogTitle>
            <DialogDescription>Enter the name of the next bowler</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Bowler Name</Label>
              <Select value={nextBowlerName} onValueChange={setNextBowlerName}>
                <SelectTrigger>
                  <SelectValue placeholder="Select or type bowler" />
                </SelectTrigger>
                <MobileSafeSelectContent>
                  {currentInnings.bowlingTeam.players.map((player) => (
                    <SelectItem key={Number(player.id)} value={player.name}>
                      {player.name}
                    </SelectItem>
                  ))}
                </MobileSafeSelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowBowlerDialog(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={confirmNewBowler} className="w-full sm:w-auto">
              Confirm Bowler
            </Button>
          </DialogFooter>
        </MobileSafeDialogContent>
      </Dialog>
    </div>
  );
}
