import { useParams, useNavigate } from '@tanstack/react-router';
import { useGetMatch } from '../hooks/useQueries';
import { parseMatchId } from '../utils/parseMatchId';
import { formatTossInfo } from '../utils/formatTossInfo';
import { getChaseTarget, getMatchResultSentence } from '../utils/chase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, BarChart3, Target } from 'lucide-react';
import type { Innings, Ball } from '../backend';

export default function MatchSummaryPage() {
  const { matchId: rawMatchId } = useParams({ from: '/match/$matchId/summary' });
  const navigate = useNavigate();

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

  if (!match || match.innings.length < 2) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8 sm:p-12 text-center">
          <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold mb-2">Match Not Complete</h3>
          <p className="text-sm sm:text-base text-muted-foreground mb-6">
            Both innings must be completed to view the match summary
          </p>
          <Button onClick={() => navigate({ to: '/' })}>Back to Dashboard</Button>
        </CardContent>
      </Card>
    );
  }

  const matchId = parseResult.value;
  const firstInnings = match.innings[0];
  const secondInnings = match.innings[1];

  const calculateInningsStats = (innings: Innings) => {
    const totalRuns = innings.balls.reduce((sum, b) => sum + Number(b.runs), 0);
    const totalWickets = innings.balls.filter((b) => b.isWicket).length;
    const legalBalls = innings.balls.filter((b) => (b.extras ? b.extras.legalDelivery : true));
    const totalOvers = Math.floor(legalBalls.length / 6);
    const ballsInOver = legalBalls.length % 6;

    return { totalRuns, totalWickets, totalOvers, ballsInOver };
  };

  const first = calculateInningsStats(firstInnings);
  const second = calculateInningsStats(secondInnings);

  const chaseTarget = getChaseTarget(match);
  const resultSentence = getMatchResultSentence(match);

  // Determine winner for heading
  const winner =
    first.totalRuns > second.totalRuns
      ? firstInnings.battingTeam.name
      : second.totalRuns > first.totalRuns
        ? secondInnings.battingTeam.name
        : 'Match Tied';

  const handleViewStats = () => {
    try {
      navigate({ to: `/match/${matchId}/stats` });
    } catch (error) {
      console.error('Navigation to statistics failed:', error);
    }
  };

  const renderBattingScorecard = (innings: Innings) => {
    const battingStats = new Map<
      string,
      { runs: number; balls: number; fours: number; sixes: number; isOut: boolean }
    >();

    innings.battingTeam.players.forEach((player) => {
      battingStats.set(player.id.toString(), { runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false });
    });

    innings.balls.forEach((ball: Ball) => {
      const playerId = ball.batsman.id.toString();
      const stats = battingStats.get(playerId);
      if (stats) {
        const runs = Number(ball.runs);
        stats.runs += runs;

        const isLegalDelivery = ball.extras ? ball.extras.legalDelivery : true;
        if (isLegalDelivery) {
          stats.balls += 1;
        }

        if (runs === 4) stats.fours += 1;
        if (runs === 6) stats.sixes += 1;
        if (ball.isWicket) stats.isOut = true;
      }
    });

    return (
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
                const player = innings.battingTeam.players.find((p) => p.id.toString() === playerId);
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
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Match Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground break-words">
              {formatTossInfo(match)}
            </div>
            {chaseTarget !== null && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-1">
                <Target className="h-4 w-4" />
                <span>Target: {chaseTarget}</span>
              </div>
            )}
            <div className="text-center space-y-2 pt-2">
              <h2 className="text-xl sm:text-2xl font-bold text-primary break-words">{winner}</h2>
              {resultSentence && (
                <p className="text-base sm:text-lg text-muted-foreground break-words">{resultSentence}</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground break-words">{firstInnings.battingTeam.name}</p>
                  <p className="text-2xl sm:text-3xl font-bold">
                    {first.totalRuns}/{first.totalWickets}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {first.totalOvers}.{first.ballsInOver} overs
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground break-words">{secondInnings.battingTeam.name}</p>
                  <p className="text-2xl sm:text-3xl font-bold">
                    {second.totalRuns}/{second.totalWickets}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {second.totalOvers}.{second.ballsInOver} overs
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        onClick={handleViewStats}
        className="w-full touch-manipulation"
        size="lg"
      >
        <BarChart3 className="h-4 w-4 mr-2" />
        View Statistics
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Batting Scorecards</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="first" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="first">First Innings</TabsTrigger>
              <TabsTrigger value="second">Second Innings</TabsTrigger>
            </TabsList>
            <TabsContent value="first" className="mt-4">
              {renderBattingScorecard(firstInnings)}
            </TabsContent>
            <TabsContent value="second" className="mt-4">
              {renderBattingScorecard(secondInnings)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
