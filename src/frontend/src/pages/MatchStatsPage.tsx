import { useParams, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { parseMatchId } from '../utils/parseMatchId';
import { loadLocalMatch } from '../offline/localMatchStore';
import { ensureMatchInitialized } from '../utils/ensureMatchInitialized';
import { computeBattingStats, computeBowlingStats } from '../utils/matchStats';
import type { Match } from '../backend';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft } from 'lucide-react';

export default function MatchStatsPage() {
  const { matchId: matchIdParam } = useParams({ strict: false });
  const navigate = useNavigate();
  const [match, setMatch] = useState<Match | null>(null);

  const parseResult = parseMatchId(matchIdParam);
  const matchId = parseResult.success ? parseResult.value : null;

  useEffect(() => {
    if (!matchId) return;
    const loaded = loadLocalMatch(matchId);
    if (loaded) {
      setMatch(ensureMatchInitialized(loaded));
    }
  }, [matchId]);

  if (!parseResult.success || !match) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-destructive">Match not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: `/match/${matchId}` })}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Match
        </Button>
        <h1 className="text-2xl font-bold">Match Statistics</h1>
      </div>

      <Tabs defaultValue="innings-1">
        <TabsList>
          {match.innings.map((_, index) => (
            <TabsTrigger key={index} value={`innings-${index + 1}`}>
              Innings {index + 1}
            </TabsTrigger>
          ))}
        </TabsList>

        {match.innings.map((innings, index) => {
          const battingStats = computeBattingStats(innings);
          const bowlingStats = computeBowlingStats(innings);

          return (
            <TabsContent key={index} value={`innings-${index + 1}`} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Batting - {innings.battingTeam.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Batter</TableHead>
                        <TableHead className="text-right">Runs</TableHead>
                        <TableHead className="text-right">Balls</TableHead>
                        <TableHead className="text-right">4s</TableHead>
                        <TableHead className="text-right">6s</TableHead>
                        <TableHead className="text-right">SR</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {battingStats.map((stat) => (
                        <TableRow key={stat.player.id.toString()}>
                          <TableCell className="font-medium">{stat.player.name}</TableCell>
                          <TableCell className="text-right">{stat.runs}</TableCell>
                          <TableCell className="text-right">{stat.balls}</TableCell>
                          <TableCell className="text-right">{stat.fours}</TableCell>
                          <TableCell className="text-right">{stat.sixes}</TableCell>
                          <TableCell className="text-right">{stat.strikeRate}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Bowling - {innings.bowlingTeam.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bowler</TableHead>
                        <TableHead className="text-right">Overs</TableHead>
                        <TableHead className="text-right">Runs</TableHead>
                        <TableHead className="text-right">Wickets</TableHead>
                        <TableHead className="text-right">Econ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bowlingStats.map((stat) => (
                        <TableRow key={stat.bowler.id.toString()}>
                          <TableCell className="font-medium">{stat.bowler.name}</TableCell>
                          <TableCell className="text-right">{stat.overs}</TableCell>
                          <TableCell className="text-right">{stat.runs}</TableCell>
                          <TableCell className="text-right">{stat.wickets}</TableCell>
                          <TableCell className="text-right">{stat.economy}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
