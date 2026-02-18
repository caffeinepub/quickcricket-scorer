import { useParams, useNavigate } from '@tanstack/react-router';
import { useGetMatch } from '../hooks/useQueries';
import { parseMatchId } from '../utils/parseMatchId';
import { computeBattingStats, computeBowlingStats } from '../utils/matchStats';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function MatchStatsPage() {
  const { matchId: rawMatchId } = useParams({ from: '/match/$matchId/stats' });
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
    return <div className="text-center py-12">Loading match statistics...</div>;
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

  if (match.innings.length === 0) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8 sm:p-12 text-center">
          <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold mb-2">No Statistics Available</h3>
          <p className="text-sm sm:text-base text-muted-foreground mb-6">
            No balls recorded yet. Start scoring to see statistics.
          </p>
          <Button onClick={() => navigate({ to: '/' })}>Back to Dashboard</Button>
        </CardContent>
      </Card>
    );
  }

  const matchId = parseResult.value;

  const renderInningsStats = (inningsIndex: number) => {
    const innings = match.innings[inningsIndex];
    
    if (!innings || innings.balls.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <p>No balls recorded yet</p>
        </div>
      );
    }

    const battingStats = computeBattingStats(innings);
    const bowlingStats = computeBowlingStats(innings);

    return (
      <div className="space-y-6">
        {/* Batting Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">
              Batting - {innings.battingTeam.name}
            </CardTitle>
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
                    {battingStats.map((stats) => (
                      <TableRow key={stats.player.id.toString()}>
                        <TableCell className="text-xs sm:text-sm font-medium break-words max-w-[120px] sm:max-w-none">
                          {stats.player.name}
                          {stats.isOut && <span className="text-muted-foreground ml-1">(out)</span>}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm text-right">{stats.runs}</TableCell>
                        <TableCell className="text-xs sm:text-sm text-right">{stats.balls}</TableCell>
                        <TableCell className="text-xs sm:text-sm text-right">{stats.fours}</TableCell>
                        <TableCell className="text-xs sm:text-sm text-right">{stats.sixes}</TableCell>
                        <TableCell className="text-xs sm:text-sm text-right">{stats.strikeRate}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bowling Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">
              Bowling - {innings.bowlingTeam.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm">Bowler</TableHead>
                      <TableHead className="text-xs sm:text-sm text-right">O</TableHead>
                      <TableHead className="text-xs sm:text-sm text-right">R</TableHead>
                      <TableHead className="text-xs sm:text-sm text-right">W</TableHead>
                      <TableHead className="text-xs sm:text-sm text-right">Econ</TableHead>
                      <TableHead className="text-xs sm:text-sm text-right">WD</TableHead>
                      <TableHead className="text-xs sm:text-sm text-right">NB</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bowlingStats.map((stats) => (
                      <TableRow key={stats.bowler.id.toString()}>
                        <TableCell className="text-xs sm:text-sm font-medium break-words max-w-[120px] sm:max-w-none">
                          {stats.bowler.name}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm text-right">{stats.overs}</TableCell>
                        <TableCell className="text-xs sm:text-sm text-right">{stats.runs}</TableCell>
                        <TableCell className="text-xs sm:text-sm text-right">{stats.wickets}</TableCell>
                        <TableCell className="text-xs sm:text-sm text-right">{stats.economy}</TableCell>
                        <TableCell className="text-xs sm:text-sm text-right">{stats.wides}</TableCell>
                        <TableCell className="text-xs sm:text-sm text-right">{stats.noBalls}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate({ to: `/match/${matchId}` })}
          className="touch-manipulation"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-xl sm:text-2xl font-bold">Match Statistics</h1>
      </div>

      {match.innings.length === 1 ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">First Innings</CardTitle>
            </CardHeader>
          </Card>
          {renderInningsStats(0)}
        </div>
      ) : (
        <Tabs defaultValue="first" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="first">First Innings</TabsTrigger>
            <TabsTrigger value="second">Second Innings</TabsTrigger>
          </TabsList>
          <TabsContent value="first" className="space-y-6 mt-4">
            {renderInningsStats(0)}
          </TabsContent>
          <TabsContent value="second" className="space-y-6 mt-4">
            {renderInningsStats(1)}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
