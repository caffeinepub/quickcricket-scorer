import { useParams, useNavigate } from '@tanstack/react-router';
import { useGetMatch, useStartInnings } from '../hooks/useQueries';
import { useConnectivity } from '../hooks/useConnectivity';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function InningsSummaryPage() {
  const { matchId } = useParams({ from: '/match/$matchId/innings-summary' });
  const navigate = useNavigate();
  const { data: match, isLoading } = useGetMatch(BigInt(matchId));
  const startInnings = useStartInnings();
  const { isOffline } = useConnectivity();

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!match) {
    return <div className="text-center py-12">Match not found</div>;
  }

  const lastInnings = match.innings[match.innings.length - 1];

  const handleStartNextInnings = async () => {
    if (match.innings.length >= 2) {
      navigate({ to: `/match/${matchId}/summary` });
      return;
    }

    try {
      await startInnings.mutateAsync({
        matchId: BigInt(matchId),
        battingTeam: match.teams[1],
        bowlingTeam: match.teams[0],
        overs: match.oversPerInnings ?? null,
      });
      if (isOffline) {
        toast.success('Second innings started (saved locally)');
      } else {
        toast.success('Second innings started');
      }
      navigate({ to: `/match/${matchId}` });
    } catch (error) {
      toast.error('Failed to start innings');
      console.error(error);
    }
  };

  // Calculate legal balls for display
  const legalBalls = lastInnings.balls.filter((b) => {
    if (!b.extras) return true;
    return b.extras.legalDelivery;
  }).length;
  const overs = Math.floor(legalBalls / 6);
  const ballsInOver = legalBalls % 6;

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

      <Card>
        <CardHeader>
          <CardTitle>Innings Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <h2 className="text-3xl font-bold mb-2">{lastInnings.battingTeam.name}</h2>
            <div className="text-5xl font-bold text-primary mb-4">
              {Number(lastInnings.totalRuns)}/{Number(lastInnings.totalWickets)}
            </div>
            <p className="text-muted-foreground">
              {overs}.{ballsInOver} overs
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Batting Summary</CardTitle>
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
              {lastInnings.battingTeam.players.map((player) => {
                const balls = lastInnings.balls.filter((b) => b.batsman.id === player.id);
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

      <Button onClick={handleStartNextInnings} size="lg" className="w-full">
        {match.innings.length >= 2 ? 'View Match Summary' : 'Start Second Innings'}
        <ArrowRight className="h-5 w-5 ml-2" />
      </Button>
    </div>
  );
}
