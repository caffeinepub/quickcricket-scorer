import { useParams, useNavigate } from '@tanstack/react-router';
import { useGetMatch } from '../hooks/useQueries';
import { useConnectivity } from '../hooks/useConnectivity';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Home } from 'lucide-react';

export default function MatchSummaryPage() {
  const { matchId } = useParams({ from: '/match/$matchId/summary' });
  const navigate = useNavigate();
  const { data: match, isLoading } = useGetMatch(BigInt(matchId));
  const { isOffline } = useConnectivity();

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!match || match.innings.length < 2) {
    return <div className="text-center py-12">Match not complete</div>;
  }

  const innings1 = match.innings[0];
  const innings2 = match.innings[1];

  const team1Score = Number(innings1.totalRuns);
  const team2Score = Number(innings2.totalRuns);

  let result = '';
  if (team1Score > team2Score) {
    result = `${innings1.battingTeam.name} won by ${team1Score - team2Score} runs`;
  } else if (team2Score > team1Score) {
    const wicketsRemaining = 10 - Number(innings2.totalWickets);
    result = `${innings2.battingTeam.name} won by ${wicketsRemaining} wickets`;
  } else {
    result = 'Match tied';
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {isOffline && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <p className="text-sm text-amber-800 font-medium">
              ⚠️ Offline Mode: Viewing locally saved data
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="bg-primary text-primary-foreground">
        <CardContent className="p-8 text-center">
          <Trophy className="h-16 w-16 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-2">Match Complete</h2>
          <p className="text-xl opacity-90">{result}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Match Score</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-lg">{innings1.battingTeam.name}</span>
            <span className="text-2xl font-bold">
              {team1Score}/{Number(innings1.totalWickets)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-semibold text-lg">{innings2.battingTeam.name}</span>
            <span className="text-2xl font-bold">
              {team2Score}/{Number(innings2.totalWickets)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="innings1">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="innings1">{innings1.battingTeam.name} Innings</TabsTrigger>
          <TabsTrigger value="innings2">{innings2.battingTeam.name} Innings</TabsTrigger>
        </TabsList>
        <TabsContent value="innings1">
          <Card>
            <CardHeader>
              <CardTitle>Batting Scorecard</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batter</TableHead>
                    <TableHead className="text-right">Runs</TableHead>
                    <TableHead className="text-right">Balls</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {innings1.battingTeam.players.map((player) => {
                    const balls = innings1.balls.filter((b) => b.batsman.id === player.id);
                    const runs = balls.reduce((sum, b) => sum + Number(b.runs), 0);
                    const legalBallsFaced = balls.filter((b) => !b.extras || b.extras.legalDelivery).length;
                    return (
                      <TableRow key={Number(player.id)}>
                        <TableCell className="font-medium">{player.name}</TableCell>
                        <TableCell className="text-right">{runs}</TableCell>
                        <TableCell className="text-right">{legalBallsFaced}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="innings2">
          <Card>
            <CardHeader>
              <CardTitle>Batting Scorecard</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batter</TableHead>
                    <TableHead className="text-right">Runs</TableHead>
                    <TableHead className="text-right">Balls</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {innings2.battingTeam.players.map((player) => {
                    const balls = innings2.balls.filter((b) => b.batsman.id === player.id);
                    const runs = balls.reduce((sum, b) => sum + Number(b.runs), 0);
                    const legalBallsFaced = balls.filter((b) => !b.extras || b.extras.legalDelivery).length;
                    return (
                      <TableRow key={Number(player.id)}>
                        <TableCell className="font-medium">{player.name}</TableCell>
                        <TableCell className="text-right">{runs}</TableCell>
                        <TableCell className="text-right">{legalBallsFaced}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Button onClick={() => navigate({ to: '/' })} size="lg" className="w-full">
        <Home className="h-5 w-5 mr-2" />
        Back to Dashboard
      </Button>
    </div>
  );
}
