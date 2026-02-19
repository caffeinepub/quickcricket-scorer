import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { loadSavedTeams } from '../offline/teamRosterStore';
import { loadAllLocalMatches } from '../offline/localMatchStore';
import { computeCumulativePlayerStats } from '../utils/cumulativePlayerStats';
import type { CumulativePlayerStats } from '../utils/cumulativePlayerStats';
import type { SavedTeamRoster } from '../offline/teamRosterStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, BarChart3, TrendingUp } from 'lucide-react';

export default function PlayerStatsPage() {
  const navigate = useNavigate();
  const [savedTeams, setSavedTeams] = useState<SavedTeamRoster[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedPlayerName, setSelectedPlayerName] = useState<string>('');
  const [playerStats, setPlayerStats] = useState<CumulativePlayerStats | null>(null);
  const [allStats, setAllStats] = useState<Map<string, CumulativePlayerStats>>(new Map());

  useEffect(() => {
    // Load saved teams
    const teams = loadSavedTeams();
    setSavedTeams(teams);

    // Compute cumulative stats from all local matches
    const matches = loadAllLocalMatches();
    const stats = computeCumulativePlayerStats(matches);
    setAllStats(stats);
  }, []);

  useEffect(() => {
    if (selectedPlayerName) {
      const stats = allStats.get(selectedPlayerName);
      setPlayerStats(stats || null);
    } else {
      setPlayerStats(null);
    }
  }, [selectedPlayerName, allStats]);

  const selectedTeam = savedTeams.find(t => t.id === selectedTeamId);
  const availablePlayers = selectedTeam ? selectedTeam.team.players : [];

  const handleTeamChange = (teamId: string) => {
    setSelectedTeamId(teamId);
    setSelectedPlayerName('');
    setPlayerStats(null);
  };

  const handlePlayerChange = (playerName: string) => {
    setSelectedPlayerName(playerName);
  };

  const formatBattingAverage = (stats: CumulativePlayerStats) => {
    if (stats.batting.outs === 0) return 'N/A';
    return (stats.batting.runs / stats.batting.outs).toFixed(2);
  };

  const formatStrikeRate = (stats: CumulativePlayerStats) => {
    if (stats.batting.ballsFaced === 0) return '0.0';
    return ((stats.batting.runs / stats.batting.ballsFaced) * 100).toFixed(1);
  };

  const formatBowlingAverage = (stats: CumulativePlayerStats) => {
    if (stats.bowling.wickets === 0) return 'N/A';
    return (stats.bowling.runsConceded / stats.bowling.wickets).toFixed(2);
  };

  const formatEconomy = (stats: CumulativePlayerStats) => {
    if (stats.bowling.ballsBowled === 0) return '0.0';
    const overs = stats.bowling.ballsBowled / 6;
    return (stats.bowling.runsConceded / overs).toFixed(2);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Player Statistics
              </CardTitle>
              <CardDescription>View cumulative player performance across all matches</CardDescription>
            </div>
            <Button onClick={() => navigate({ to: '/' })} variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="team-select">Select Team</Label>
              <Select value={selectedTeamId} onValueChange={handleTeamChange}>
                <SelectTrigger id="team-select">
                  <SelectValue placeholder="Choose a team" />
                </SelectTrigger>
                <SelectContent>
                  {savedTeams.map(roster => (
                    <SelectItem key={roster.id} value={roster.id}>
                      {roster.team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="player-select">Select Player</Label>
              <Select
                value={selectedPlayerName}
                onValueChange={handlePlayerChange}
                disabled={!selectedTeamId}
              >
                <SelectTrigger id="player-select">
                  <SelectValue placeholder="Choose a player" />
                </SelectTrigger>
                <SelectContent>
                  {availablePlayers.map(player => (
                    <SelectItem key={player.id.toString()} value={player.name}>
                      {player.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedPlayerName && (
        <Card>
          <CardContent className="p-12 text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Select a team and player to view their statistics</p>
          </CardContent>
        </Card>
      )}

      {selectedPlayerName && !playerStats && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">No statistics available for {selectedPlayerName}</p>
          </CardContent>
        </Card>
      )}

      {playerStats && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Batting Statistics</CardTitle>
              <CardDescription>{playerStats.playerName}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Matches</TableHead>
                      <TableHead>Runs</TableHead>
                      <TableHead>Balls</TableHead>
                      <TableHead>Avg</TableHead>
                      <TableHead>SR</TableHead>
                      <TableHead>4s</TableHead>
                      <TableHead>6s</TableHead>
                      <TableHead>Outs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>{playerStats.matchesPlayed}</TableCell>
                      <TableCell className="font-semibold">{playerStats.batting.runs}</TableCell>
                      <TableCell>{playerStats.batting.ballsFaced}</TableCell>
                      <TableCell>{formatBattingAverage(playerStats)}</TableCell>
                      <TableCell>{formatStrikeRate(playerStats)}</TableCell>
                      <TableCell>{playerStats.batting.fours}</TableCell>
                      <TableCell>{playerStats.batting.sixes}</TableCell>
                      <TableCell>{playerStats.batting.outs}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bowling Statistics</CardTitle>
              <CardDescription>{playerStats.playerName}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Balls</TableHead>
                      <TableHead>Runs</TableHead>
                      <TableHead>Wickets</TableHead>
                      <TableHead>Avg</TableHead>
                      <TableHead>Econ</TableHead>
                      <TableHead>Wides</TableHead>
                      <TableHead>No Balls</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>{playerStats.bowling.ballsBowled}</TableCell>
                      <TableCell>{playerStats.bowling.runsConceded}</TableCell>
                      <TableCell className="font-semibold">{playerStats.bowling.wickets}</TableCell>
                      <TableCell>{formatBowlingAverage(playerStats)}</TableCell>
                      <TableCell>{formatEconomy(playerStats)}</TableCell>
                      <TableCell>{playerStats.bowling.wides}</TableCell>
                      <TableCell>{playerStats.bowling.noBalls}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
