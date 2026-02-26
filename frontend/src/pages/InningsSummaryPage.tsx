import { useParams, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useGetMatch } from '../hooks/useQueries';
import { useConnectivity } from '../hooks/useConnectivity';
import { parseMatchId } from '../utils/parseMatchId';
import { formatTossInfo } from '../utils/formatTossInfo';
import { localMatchStore } from '../offline/localMatchStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import type { Player, Ball, Innings, Team } from '../backend';
import { useActor } from '../hooks/useActor';

export default function InningsSummaryPage() {
  const { matchId: rawMatchId } = useParams({ from: '/match/$matchId/innings-summary' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isOffline } = useConnectivity();
  const { actor } = useActor();

  const parseResult = parseMatchId(rawMatchId);
  const { data: match, isLoading, error } = useGetMatch(parseResult.success ? parseResult.value : BigInt(0));

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
            {error instanceof Error ? error.message : 'Failed to load match data'}
          </p>
          <Button onClick={() => navigate({ to: '/' })}>Back to Dashboard</Button>
        </CardContent>
      </Card>
    );
  }

  if (!match) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8 sm:p-12 text-center">
          <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold mb-2">Match Not Found</h3>
          <p className="text-sm sm:text-base text-muted-foreground mb-6">
            Unable to load match data from this device
          </p>
          <Button onClick={() => navigate({ to: '/' })}>Back to Dashboard</Button>
        </CardContent>
      </Card>
    );
  }

  const lastInnings = match.innings[match.innings.length - 1];
  if (!lastInnings) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8 sm:p-12 text-center">
          <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold mb-2">No Innings Data</h3>
          <p className="text-sm sm:text-base text-muted-foreground mb-6">
            No innings data available for this match
          </p>
          <Button onClick={() => navigate({ to: '/' })}>Back to Dashboard</Button>
        </CardContent>
      </Card>
    );
  }

  const matchId = parseResult.value;

  // Calculate batting statistics
  const battingStats = new Map<string, { runs: number; balls: number; fours: number; sixes: number; isOut: boolean }>();

  lastInnings.battingTeam.players.forEach((player) => {
    battingStats.set(player.id.toString(), { runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false });
  });

  lastInnings.balls.forEach((ball: Ball) => {
    const playerId = ball.batsman.id.toString();
    const stats = battingStats.get(playerId);
    if (stats) {
      const runs = Number(ball.runs);
      stats.runs += runs;
      
      // Only count legal deliveries as balls faced
      const isLegalDelivery = ball.extras ? ball.extras.legalDelivery : true;
      if (isLegalDelivery) {
        stats.balls += 1;
      }
      
      if (runs === 4) stats.fours += 1;
      if (runs === 6) stats.sixes += 1;
      if (ball.isWicket) stats.isOut = true;
    }
  });

  const totalRuns = lastInnings.balls.reduce((sum, b) => sum + Number(b.runs), 0);
  const totalWickets = lastInnings.balls.filter((b) => b.isWicket).length;
  const legalBalls = lastInnings.balls.filter((b) => (b.extras ? b.extras.legalDelivery : true));
  const totalOvers = Math.floor(legalBalls.length / 6);
  const ballsInOver = legalBalls.length % 6;

  const handleStartSecondInnings = async () => {
    if (match.innings.length >= 2) {
      toast.error('Both innings have already been played');
      return;
    }

    try {
      // Swap teams: team that bowled first now bats, team that batted first now bowls
      const battingTeam: Team = {
        ...lastInnings.bowlingTeam,
        players: [...lastInnings.bowlingTeam.players], // Deep copy players array
      };
      const bowlingTeam: Team = {
        ...lastInnings.battingTeam,
        players: [...lastInnings.battingTeam.players], // Deep copy players array
      };
      
      // Validate that both teams have players
      if (battingTeam.players.length === 0 || bowlingTeam.players.length === 0) {
        toast.error('Cannot start second innings: team rosters are incomplete');
        return;
      }

      const overs = match.oversPerInnings ? match.oversPerInnings : undefined;

      const newInnings: Innings = {
        battingTeam,
        bowlingTeam,
        balls: [],
        totalRuns: 0n,
        totalWickets: 0n,
        overs,
        ballsInCurrentOver: 0n,
        currentStriker: undefined,
        currentNonStriker: undefined,
        currentBowler: undefined,
      };

      const isLocalOnly = (match as any)._localOnly === true;

      // If backend-stored match and online with actor, call backend
      if (!isLocalOnly && !isOffline && actor) {
        try {
          await actor.startSecondInnings(matchId, newInnings);
          
          // Fetch the updated match from backend
          const backendMatch = await actor.getMatch(matchId);
          if (!backendMatch) {
            throw new Error('Failed to retrieve updated match from backend');
          }
          
          // Save the backend match locally
          localMatchStore.saveMatch(backendMatch);
          
          // Invalidate cache before navigation
          await queryClient.invalidateQueries({ queryKey: ['match', matchId.toString()] });
          
          toast.success('Second innings started successfully');
          navigate({ to: `/match/${matchId}` });
          return;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to start second innings on backend';
          toast.error(errorMessage);
          console.error('Start second innings backend error:', error);
          return;
        }
      }

      // Local-only or offline: append innings locally
      const updatedMatch = {
        ...match,
        innings: [...match.innings, newInnings],
      };

      localMatchStore.saveMatch(updatedMatch);
      
      // Invalidate cache before navigation
      await queryClient.invalidateQueries({ queryKey: ['match', matchId.toString()] });
      
      toast.success('Second innings started successfully');
      navigate({ to: `/match/${matchId}` });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start second innings';
      toast.error(errorMessage);
      console.error('Start second innings failed:', error);
    }
  };

  const handleViewMatchSummary = () => {
    navigate({ to: `/match/${matchId}/summary` });
  };

  const handleViewStats = () => {
    try {
      // Invalidate cache before navigation
      queryClient.invalidateQueries({ queryKey: ['match', matchId.toString()] });
      navigate({ to: `/match/${matchId}/stats` });
    } catch (error) {
      console.error('Navigation to statistics failed:', error);
      toast.error('Failed to navigate to statistics');
    }
  };

  const isSecondInnings = match.innings.length >= 2;

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Innings Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground break-words">
              {formatTossInfo(match)}
            </div>
            <div className="text-center space-y-2 pt-2">
              <h2 className="text-xl sm:text-2xl font-bold break-words">{lastInnings.battingTeam.name}</h2>
              <div className="text-4xl sm:text-5xl font-bold">
                {totalRuns}/{totalWickets}
              </div>
              <div className="text-lg sm:text-xl text-muted-foreground">
                {totalOvers}.{ballsInOver} Overs
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Batting Scorecard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">Batsman</TableHead>
                    <TableHead className="text-xs sm:text-sm text-right">R</TableHead>
                    <TableHead className="text-xs sm:text-sm text-right">B</TableHead>
                    <TableHead className="text-xs sm:text-sm text-right">4s</TableHead>
                    <TableHead className="text-xs sm:text-sm text-right">6s</TableHead>
                    <TableHead className="text-xs sm:text-sm text-right">SR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from(battingStats.entries()).map(([playerId, stats]) => {
                    const player = lastInnings.battingTeam.players.find((p) => p.id.toString() === playerId);
                    if (!player) return null;

                    const strikeRate = stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(1) : '0.0';

                    return (
                      <TableRow key={playerId}>
                        <TableCell className="text-xs sm:text-sm font-medium break-words max-w-[120px] sm:max-w-none">
                          {player.name}
                          {stats.isOut && <span className="text-muted-foreground ml-1">(out)</span>}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm text-right">{stats.runs}</TableCell>
                        <TableCell className="text-xs sm:text-sm text-right">{stats.balls}</TableCell>
                        <TableCell className="text-xs sm:text-sm text-right">{stats.fours}</TableCell>
                        <TableCell className="text-xs sm:text-sm text-right">{stats.sixes}</TableCell>
                        <TableCell className="text-xs sm:text-sm text-right">{strikeRate}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3">
        {!isSecondInnings && (
          <Button
            onClick={handleStartSecondInnings}
            disabled={false}
            className="flex-1 touch-manipulation"
            size="lg"
          >
            Start Second Innings
          </Button>
        )}
        {isSecondInnings && (
          <Button
            onClick={handleViewMatchSummary}
            className="flex-1 touch-manipulation"
            size="lg"
          >
            View Match Summary
          </Button>
        )}
        <Button
          variant="outline"
          onClick={handleViewStats}
          className="flex-1 touch-manipulation"
          size="lg"
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          View Statistics
        </Button>
      </div>
    </div>
  );
}
