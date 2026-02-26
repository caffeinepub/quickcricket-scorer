import React, { useMemo } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { loadLocalMatch } from '../offline/localMatchStore';
import { parseMatchId } from '../utils/parseMatchId';
import { computeBattingStats, computeBowlingStats } from '../utils/matchStats';
import { useQueryClient } from '@tanstack/react-query';

export default function MatchStatsPage() {
  const { matchId: matchIdParam } = useParams({ strict: false }) as { matchId?: string };
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const parseResult = parseMatchId(matchIdParam ?? '');
  const matchId = parseResult.success ? parseResult.value : null;

  const match = useMemo(() => {
    if (!matchId) return null;
    return loadLocalMatch(matchId);
  }, [matchId]);

  const handleBack = () => {
    if (matchId) {
      queryClient.invalidateQueries({ queryKey: ['match', matchId.toString()] });
      navigate({
        to: '/match/$matchId',
        params: { matchId: matchId.toString() },
      });
    } else {
      navigate({ to: '/' });
    }
  };

  if (!parseResult.success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6">
        <BarChart2 className="w-12 h-12 text-muted-foreground" />
        <p className="text-lg font-semibold text-foreground">Invalid Match ID</p>
        <Button variant="outline" onClick={() => navigate({ to: '/' })}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6">
        <BarChart2 className="w-12 h-12 text-muted-foreground" />
        <p className="text-lg font-semibold text-foreground">Match not found</p>
        <p className="text-sm text-muted-foreground">
          This match may have been deleted or is not available offline.
        </p>
        <Button variant="outline" onClick={() => navigate({ to: '/' })}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  if (match.innings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6">
        <BarChart2 className="w-12 h-12 text-muted-foreground" />
        <p className="text-lg font-semibold text-foreground">No innings data yet</p>
        <p className="text-sm text-muted-foreground">
          Statistics will appear once the match has started.
        </p>
        <Button variant="outline" onClick={handleBack}>
          Back to Match
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={handleBack} aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" />
            Match Statistics
          </h1>
          <p className="text-sm text-muted-foreground">
            {match.teams.map((t) => t.name).join(' vs ')}
          </p>
        </div>
      </div>

      {/* Innings Tabs */}
      <Tabs defaultValue="innings-0">
        <TabsList className="w-full">
          {match.innings.map((innings, idx) => (
            <TabsTrigger key={idx} value={`innings-${idx}`} className="flex-1">
              {innings.battingTeam.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {match.innings.map((innings, idx) => {
          const battingStats = computeBattingStats(innings);
          const bowlingStats = computeBowlingStats(innings);

          return (
            <TabsContent key={idx} value={`innings-${idx}`} className="flex flex-col gap-6 mt-4">
              {/* Score Summary */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Badge variant="secondary" className="text-base px-3 py-1">
                  {innings.totalRuns.toString()}/{innings.totalWickets.toString()}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {innings.battingTeam.name} batting
                </span>
              </div>

              {/* Batting Stats */}
              <div>
                <h2 className="text-base font-semibold mb-2 text-foreground">Batting</h2>
                {battingStats.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No batting data recorded.</p>
                ) : (
                  <div className="overflow-x-auto rounded-md border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Batter</TableHead>
                          <TableHead className="text-right">R</TableHead>
                          <TableHead className="text-right">B</TableHead>
                          <TableHead className="text-right">4s</TableHead>
                          <TableHead className="text-right">6s</TableHead>
                          <TableHead className="text-right">SR</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {battingStats.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{row.playerName}</TableCell>
                            <TableCell className="text-right">{row.runs}</TableCell>
                            <TableCell className="text-right">{row.ballsFaced}</TableCell>
                            <TableCell className="text-right">{row.fours}</TableCell>
                            <TableCell className="text-right">{row.sixes}</TableCell>
                            <TableCell className="text-right">{row.strikeRate}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {/* Bowling Stats */}
              <div>
                <h2 className="text-base font-semibold mb-2 text-foreground">Bowling</h2>
                {bowlingStats.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No bowling data recorded.</p>
                ) : (
                  <div className="overflow-x-auto rounded-md border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Bowler</TableHead>
                          <TableHead className="text-right">O</TableHead>
                          <TableHead className="text-right">R</TableHead>
                          <TableHead className="text-right">W</TableHead>
                          <TableHead className="text-right">Econ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bowlingStats.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{row.playerName}</TableCell>
                            <TableCell className="text-right">{row.overs}</TableCell>
                            <TableCell className="text-right">{row.runsConceded}</TableCell>
                            <TableCell className="text-right">{row.wickets}</TableCell>
                            <TableCell className="text-right">{row.economyRate}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
