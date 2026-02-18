import { useState, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useCreateMatch, useStartInnings } from '../hooks/useQueries';
import { useConnectivity } from '../hooks/useConnectivity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MobileSafeSelectContent } from '@/components/mobile/MobileSafeSelectContent';
import { toast } from 'sonner';
import type { Team, Player, TossInfo, TossDecision } from '../backend';

export default function MatchSetupPage() {
  const navigate = useNavigate();
  const { isOffline } = useConnectivity();
  const createMatch = useCreateMatch();
  const startInnings = useStartInnings();

  const [team1Name, setTeam1Name] = useState('');
  const [team2Name, setTeam2Name] = useState('');
  const [team1Players, setTeam1Players] = useState<string[]>(['', '']);
  const [team2Players, setTeam2Players] = useState<string[]>(['', '']);
  const [oversPerInnings, setOversPerInnings] = useState('20');
  const [battingFirst, setBattingFirst] = useState<'team1' | 'team2'>('team1');
  const [tossWinner, setTossWinner] = useState<'team1' | 'team2' | ''>('');
  const [tossDecision, setTossDecision] = useState<'bat' | 'bowl' | ''>('');

  const addPlayer = (team: 'team1' | 'team2') => {
    if (team === 'team1') {
      setTeam1Players([...team1Players, '']);
    } else {
      setTeam2Players([...team2Players, '']);
    }
  };

  const updatePlayer = (team: 'team1' | 'team2', index: number, name: string) => {
    if (team === 'team1') {
      const updated = [...team1Players];
      updated[index] = name;
      setTeam1Players(updated);
    } else {
      const updated = [...team2Players];
      updated[index] = name;
      setTeam2Players(updated);
    }
  };

  const removePlayer = (team: 'team1' | 'team2', index: number) => {
    if (team === 'team1') {
      setTeam1Players(team1Players.filter((_, i) => i !== index));
    } else {
      setTeam2Players(team2Players.filter((_, i) => i !== index));
    }
  };

  const handleStartMatch = async () => {
    // Validation
    if (!team1Name.trim()) {
      toast.error('Please enter Team 1 name');
      return;
    }
    if (!team2Name.trim()) {
      toast.error('Please enter Team 2 name');
      return;
    }

    const validTeam1Players = team1Players.filter((p) => p.trim());
    const validTeam2Players = team2Players.filter((p) => p.trim());

    if (validTeam1Players.length < 2) {
      toast.error('Team 1 must have at least 2 players');
      return;
    }
    if (validTeam2Players.length < 2) {
      toast.error('Team 2 must have at least 2 players');
      return;
    }

    const overs = parseInt(oversPerInnings);
    if (isNaN(overs) || overs < 1 || overs > 50) {
      toast.error('Overs must be between 1 and 50');
      return;
    }

    // Validate toss information
    if (!tossWinner) {
      toast.error('Please select the toss winner');
      return;
    }
    if (!tossDecision) {
      toast.error('Please select the toss decision');
      return;
    }

    try {
      // Create teams
      const team1: Team = {
        id: BigInt(1),
        name: team1Name.trim(),
        players: validTeam1Players.map(
          (name, i): Player => ({
            id: BigInt(i + 1),
            name: name.trim(),
            battingOrderPosition: BigInt(i + 1),
          })
        ),
      };

      const team2: Team = {
        id: BigInt(2),
        name: team2Name.trim(),
        players: validTeam2Players.map(
          (name, i): Player => ({
            id: BigInt(i + 1),
            name: name.trim(),
            battingOrderPosition: BigInt(i + 1),
          })
        ),
      };

      // Create toss info
      const tossInfo: TossInfo = {
        winnerTeamId: tossWinner === 'team1' ? BigInt(1) : BigInt(2),
        decision: tossDecision as TossDecision,
      };

      // Create match with toss info
      const matchId = await createMatch.mutateAsync({
        teams: [team1, team2],
        oversPerInnings: BigInt(overs),
        toss: tossInfo,
      });

      // Start first innings
      const battingTeam = battingFirst === 'team1' ? team1 : team2;
      const bowlingTeam = battingFirst === 'team1' ? team2 : team1;

      await startInnings.mutateAsync({
        matchId,
        battingTeam,
        bowlingTeam,
        overs: BigInt(overs),
      });

      toast.success('Match created successfully');
      navigate({ to: `/match/${matchId}` });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create match';
      toast.error(`Match creation failed: ${errorMessage}`);
      console.error('Match creation failed:', error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Match Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          {/* Team 1 */}
          <div className="space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team1-name" className="text-sm sm:text-base">
                Team 1 Name
              </Label>
              <Input
                id="team1-name"
                value={team1Name}
                onChange={(e) => setTeam1Name(e.target.value)}
                placeholder="Enter team name"
                className="text-sm sm:text-base"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm sm:text-base">Team 1 Players</Label>
              {team1Players.map((player, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={player}
                    onChange={(e) => updatePlayer('team1', index, e.target.value)}
                    placeholder={`Player ${index + 1}`}
                    className="text-sm sm:text-base"
                  />
                  {team1Players.length > 2 && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => removePlayer('team1', index)}
                      className="shrink-0"
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" onClick={() => addPlayer('team1')} size="sm" className="w-full sm:w-auto">
                Add Player
              </Button>
            </div>
          </div>

          {/* Team 2 */}
          <div className="space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team2-name" className="text-sm sm:text-base">
                Team 2 Name
              </Label>
              <Input
                id="team2-name"
                value={team2Name}
                onChange={(e) => setTeam2Name(e.target.value)}
                placeholder="Enter team name"
                className="text-sm sm:text-base"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm sm:text-base">Team 2 Players</Label>
              {team2Players.map((player, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={player}
                    onChange={(e) => updatePlayer('team2', index, e.target.value)}
                    placeholder={`Player ${index + 1}`}
                    className="text-sm sm:text-base"
                  />
                  {team2Players.length > 2 && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => removePlayer('team2', index)}
                      className="shrink-0"
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" onClick={() => addPlayer('team2')} size="sm" className="w-full sm:w-auto">
                Add Player
              </Button>
            </div>
          </div>

          {/* Match Settings */}
          <div className="space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="overs" className="text-sm sm:text-base">
                Overs per Innings
              </Label>
              <Input
                id="overs"
                type="number"
                min="1"
                max="50"
                value={oversPerInnings}
                onChange={(e) => setOversPerInnings(e.target.value)}
                className="text-sm sm:text-base"
              />
            </div>

            {/* Toss Winner */}
            <div className="space-y-2">
              <Label htmlFor="toss-winner" className="text-sm sm:text-base">
                Toss Winner
              </Label>
              <Select value={tossWinner} onValueChange={(v) => setTossWinner(v as 'team1' | 'team2')}>
                <SelectTrigger id="toss-winner" className="text-sm sm:text-base">
                  <SelectValue placeholder="Select toss winner" />
                </SelectTrigger>
                <MobileSafeSelectContent>
                  <SelectItem value="team1">{team1Name || 'Team 1'}</SelectItem>
                  <SelectItem value="team2">{team2Name || 'Team 2'}</SelectItem>
                </MobileSafeSelectContent>
              </Select>
            </div>

            {/* Toss Decision */}
            <div className="space-y-2">
              <Label htmlFor="toss-decision" className="text-sm sm:text-base">
                Toss Decision
              </Label>
              <Select value={tossDecision} onValueChange={(v) => setTossDecision(v as 'bat' | 'bowl')}>
                <SelectTrigger id="toss-decision" className="text-sm sm:text-base">
                  <SelectValue placeholder="Select toss decision" />
                </SelectTrigger>
                <MobileSafeSelectContent>
                  <SelectItem value="bat">Bat</SelectItem>
                  <SelectItem value="bowl">Bowl</SelectItem>
                </MobileSafeSelectContent>
              </Select>
            </div>

            {/* Batting First (derived from toss) */}
            <div className="space-y-2">
              <Label htmlFor="batting-first" className="text-sm sm:text-base">
                Batting First
              </Label>
              <Select value={battingFirst} onValueChange={(v) => setBattingFirst(v as 'team1' | 'team2')}>
                <SelectTrigger id="batting-first" className="text-sm sm:text-base">
                  <SelectValue />
                </SelectTrigger>
                <MobileSafeSelectContent>
                  <SelectItem value="team1">{team1Name || 'Team 1'}</SelectItem>
                  <SelectItem value="team2">{team2Name || 'Team 2'}</SelectItem>
                </MobileSafeSelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleStartMatch}
            disabled={createMatch.isPending || startInnings.isPending}
            size="lg"
            className="w-full"
          >
            {createMatch.isPending || startInnings.isPending ? 'Creating Match...' : 'Start Match'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
