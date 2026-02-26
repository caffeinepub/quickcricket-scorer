import React, { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, TrendingUp, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { loadAllLocalMatches } from '../offline/localMatchStore';
import { computeCumulativePlayerStats } from '../utils/cumulativePlayerStats';

export default function PlayerStatsPage() {
  const navigate = useNavigate();
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');

  // Load all matches from local storage (bound function — safe to call standalone)
  const allMatches = useMemo(() => {
    try {
      return loadAllLocalMatches();
    } catch (e) {
      console.error('[PlayerStatsPage] Failed to load matches:', e);
      return [];
    }
  }, []);

  // Derive all unique teams from matches
  const teams = useMemo(() => {
    const teamSet = new Set<string>();
    for (const match of allMatches) {
      for (const team of match.teams) {
        teamSet.add(team.name);
      }
    }
    return Array.from(teamSet).sort();
  }, [allMatches]);

  // Derive players for selected team
  const playersForTeam = useMemo(() => {
    if (!selectedTeam) return [];
    const playerSet = new Set<string>();
    for (const match of allMatches) {
      for (const team of match.teams) {
        if (team.name === selectedTeam) {
          for (const player of team.players) {
            playerSet.add(player.name);
          }
        }
      }
    }
    return Array.from(playerSet).sort();
  }, [allMatches, selectedTeam]);

  // Compute cumulative stats for selected player
  const playerStats = useMemo(() => {
    if (!selectedPlayer) return null;
    try {
      return computeCumulativePlayerStats(allMatches, selectedPlayer);
    } catch (e) {
      console.error('[PlayerStatsPage] Failed to compute stats:', e);
      return null;
    }
  }, [allMatches, selectedPlayer]);

  const handleTeamChange = (value: string) => {
    setSelectedTeam(value);
    setSelectedPlayer('');
  };

  return (
    <div className="flex flex-col gap-6 p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: '/' })}
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Player Statistics
          </h1>
          <p className="text-sm text-muted-foreground">
            Cumulative stats from all recorded matches
          </p>
        </div>
      </div>

      {/* No matches empty state */}
      {allMatches.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground" />
          <p className="text-base font-semibold text-foreground">No matches recorded yet</p>
          <p className="text-sm text-muted-foreground">
            Play some matches to see player statistics here.
          </p>
          <Button variant="outline" onClick={() => navigate({ to: '/' })}>
            Go to Dashboard
          </Button>
        </div>
      )}

      {/* Filters */}
      {allMatches.length > 0 && (
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Select Team</label>
            <Select value={selectedTeam} onValueChange={handleTeamChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a team…" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team} value={team}>
                    {team}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTeam && (
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Select Player
              </label>
              <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a player…" />
                </SelectTrigger>
                <SelectContent>
                  {playersForTeam.map((player) => (
                    <SelectItem key={player} value={player}>
                      {player}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* Prompt states */}
      {allMatches.length > 0 && !selectedTeam && (
        <p className="text-sm text-muted-foreground text-center py-6">
          Select a team and player to view statistics.
        </p>
      )}
      {allMatches.length > 0 && selectedTeam && !selectedPlayer && (
        <p className="text-sm text-muted-foreground text-center py-6">
          Select a player to view their statistics.
        </p>
      )}

      {/* Stats Display */}
      {playerStats && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {selectedPlayer}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {playerStats.matchesPlayed} match{playerStats.matchesPlayed !== 1 ? 'es' : ''}
            </span>
          </div>

          {/* Batting Stats */}
          <div>
            <h2 className="text-base font-semibold mb-2 text-foreground">Batting</h2>
            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Runs</TableHead>
                    <TableHead>Balls</TableHead>
                    <TableHead>4s</TableHead>
                    <TableHead>6s</TableHead>
                    <TableHead>SR</TableHead>
                    <TableHead>Avg</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">{playerStats.batting.runs}</TableCell>
                    <TableCell>{playerStats.batting.ballsFaced}</TableCell>
                    <TableCell>{playerStats.batting.fours}</TableCell>
                    <TableCell>{playerStats.batting.sixes}</TableCell>
                    <TableCell>{playerStats.batting.strikeRate}</TableCell>
                    <TableCell>{playerStats.batting.average}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Bowling Stats */}
          <div>
            <h2 className="text-base font-semibold mb-2 text-foreground">Bowling</h2>
            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Wickets</TableHead>
                    <TableHead>Overs</TableHead>
                    <TableHead>Runs</TableHead>
                    <TableHead>Econ</TableHead>
                    <TableHead>Avg</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">{playerStats.bowling.wickets}</TableCell>
                    <TableCell>{playerStats.bowling.overs}</TableCell>
                    <TableCell>{playerStats.bowling.runsConceded}</TableCell>
                    <TableCell>{playerStats.bowling.economyRate}</TableCell>
                    <TableCell>{playerStats.bowling.average}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
