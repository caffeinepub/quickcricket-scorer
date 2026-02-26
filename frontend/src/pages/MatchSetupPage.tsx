import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useCreateMatch } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useConnectivity } from '../hooks/useConnectivity';
import { loadSavedTeams } from '../offline/teamRosterStore';
import type { SavedTeamRoster } from '../offline/teamRosterStore';
import type { Team, Player, TossInfo, TossDecision } from '../backend';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, ArrowLeft, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function MatchSetupPage() {
  const navigate = useNavigate();
  const createMatch = useCreateMatch();
  const { identity } = useInternetIdentity();
  const { isOffline } = useConnectivity();

  const [savedTeams, setSavedTeams] = useState<SavedTeamRoster[]>([]);
  const [selectedTeam1Id, setSelectedTeam1Id] = useState<string>('');
  const [selectedTeam2Id, setSelectedTeam2Id] = useState<string>('');

  const [team1Name, setTeam1Name] = useState('');
  const [team1Players, setTeam1Players] = useState<string[]>(['', '']);
  const [team2Name, setTeam2Name] = useState('');
  const [team2Players, setTeam2Players] = useState<string[]>(['', '']);
  const [oversPerInnings, setOversPerInnings] = useState('20');
  const [tossWinner, setTossWinner] = useState<'team1' | 'team2' | ''>('');
  const [tossDecision, setTossDecision] = useState<'bat' | 'bowl' | ''>('');

  // Check if user is authenticated
  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();
  const willCreateLocalOnly = !isAuthenticated || isOffline;

  useEffect(() => {
    setSavedTeams(loadSavedTeams());
  }, []);

  useEffect(() => {
    if (selectedTeam1Id) {
      const roster = savedTeams.find(t => t.id === selectedTeam1Id);
      if (roster) {
        setTeam1Name(roster.team.name);
        setTeam1Players(roster.team.players.map(p => p.name));
      }
    }
  }, [selectedTeam1Id, savedTeams]);

  useEffect(() => {
    if (selectedTeam2Id) {
      const roster = savedTeams.find(t => t.id === selectedTeam2Id);
      if (roster) {
        setTeam2Name(roster.team.name);
        setTeam2Players(roster.team.players.map(p => p.name));
      }
    }
  }, [selectedTeam2Id, savedTeams]);

  const handleAddPlayer = (team: 'team1' | 'team2') => {
    if (team === 'team1') {
      setTeam1Players([...team1Players, '']);
    } else {
      setTeam2Players([...team2Players, '']);
    }
  };

  const handleRemovePlayer = (team: 'team1' | 'team2', index: number) => {
    if (team === 'team1') {
      if (team1Players.length <= 2) {
        toast.error('A team must have at least 2 players');
        return;
      }
      setTeam1Players(team1Players.filter((_, i) => i !== index));
    } else {
      if (team2Players.length <= 2) {
        toast.error('A team must have at least 2 players');
        return;
      }
      setTeam2Players(team2Players.filter((_, i) => i !== index));
    }
  };

  const handlePlayerChange = (team: 'team1' | 'team2', index: number, value: string) => {
    if (team === 'team1') {
      const updated = [...team1Players];
      updated[index] = value;
      setTeam1Players(updated);
    } else {
      const updated = [...team2Players];
      updated[index] = value;
      setTeam2Players(updated);
    }
  };

  const handleCreateMatch = async () => {
    // Validation
    if (!team1Name.trim() || !team2Name.trim()) {
      toast.error('Please enter names for both teams');
      return;
    }

    const validTeam1Players = team1Players.filter(p => p.trim() !== '');
    const validTeam2Players = team2Players.filter(p => p.trim() !== '');

    if (validTeam1Players.length < 2 || validTeam2Players.length < 2) {
      toast.error('Each team must have at least 2 players');
      return;
    }

    const overs = Number(oversPerInnings);
    if (isNaN(overs) || overs < 1 || overs > 50) {
      toast.error('Overs per innings must be between 1 and 50');
      return;
    }

    if (!tossWinner || !tossDecision) {
      toast.error('Please select toss winner and decision');
      return;
    }

    // Build teams
    const team1: Team = {
      id: BigInt(1),
      name: team1Name.trim(),
      players: validTeam1Players.map((name, index) => ({
        id: BigInt(index + 1),
        name: name.trim(),
        battingOrderPosition: BigInt(index + 1),
      })),
    };

    const team2: Team = {
      id: BigInt(2),
      name: team2Name.trim(),
      players: validTeam2Players.map((name, index) => ({
        id: BigInt(index + 1 + validTeam1Players.length),
        name: name.trim(),
        battingOrderPosition: BigInt(index + 1),
      })),
    };

    const tossInfo: TossInfo = {
      winnerTeamId: tossWinner === 'team1' ? BigInt(1) : BigInt(2),
      decision: tossDecision as TossDecision,
    };

    try {
      const result = await createMatch.mutateAsync({
        teams: [team1, team2],
        oversPerInnings: BigInt(overs),
        toss: tossInfo,
      });

      // result is { matchId: bigint, isLocalOnly: boolean }
      const { matchId } = result;

      if (willCreateLocalOnly) {
        toast.success('Local match created successfully! (Saved on this device only)');
      } else {
        toast.success('Match created successfully!');
      }

      // Small delay to ensure local storage is updated, then navigate with typed params
      setTimeout(() => {
        try {
          navigate({
            to: '/match/$matchId',
            params: { matchId: matchId.toString() },
          });
        } catch (navError) {
          console.error('Navigation to live scoring failed:', navError);
          toast.error('Match created but navigation failed. Please check the dashboard.');
        }
      }, 100);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create match';
      toast.error(errorMessage);
      console.error('Match creation failed:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: '/' })}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h2 className="text-xl sm:text-2xl font-bold">Create New Match</h2>
      </div>

      {willCreateLocalOnly && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {!isAuthenticated
              ? 'You are not logged in. This match will be saved on this device only.'
              : 'You are offline. This match will be saved on this device only.'}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Match Configuration</CardTitle>
          <CardDescription>Set up teams and match format</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="overs">Overs per Innings</Label>
            <Input
              id="overs"
              type="number"
              min="1"
              max="50"
              value={oversPerInnings}
              onChange={(e) => setOversPerInnings(e.target.value)}
              placeholder="20"
            />
          </div>

          <Separator />

          {savedTeams.length > 0 && (
            <>
              <div className="space-y-4">
                <Label>Load Saved Teams (Optional)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="team1-select">Team 1</Label>
                    <Select value={selectedTeam1Id} onValueChange={setSelectedTeam1Id}>
                      <SelectTrigger id="team1-select">
                        <SelectValue placeholder="Select team 1..." />
                      </SelectTrigger>
                      <SelectContent>
                        {savedTeams.map((roster) => (
                          <SelectItem key={roster.id} value={roster.id}>
                            {roster.team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="team2-select">Team 2</Label>
                    <Select value={selectedTeam2Id} onValueChange={setSelectedTeam2Id}>
                      <SelectTrigger id="team2-select">
                        <SelectValue placeholder="Select team 2..." />
                      </SelectTrigger>
                      <SelectContent>
                        {savedTeams.map((roster) => (
                          <SelectItem key={roster.id} value={roster.id}>
                            {roster.team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          <div className="space-y-4">
            <div>
              <Label htmlFor="team1-name">Team 1 Name</Label>
              <Input
                id="team1-name"
                value={team1Name}
                onChange={(e) => setTeam1Name(e.target.value)}
                placeholder="Enter team 1 name"
              />
            </div>
            <div className="space-y-2">
              <Label>Team 1 Players</Label>
              {team1Players.map((player, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={player}
                    onChange={(e) => handlePlayerChange('team1', index, e.target.value)}
                    placeholder={`Player ${index + 1}`}
                  />
                  {team1Players.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemovePlayer('team1', index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddPlayer('team1')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Player
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div>
              <Label htmlFor="team2-name">Team 2 Name</Label>
              <Input
                id="team2-name"
                value={team2Name}
                onChange={(e) => setTeam2Name(e.target.value)}
                placeholder="Enter team 2 name"
              />
            </div>
            <div className="space-y-2">
              <Label>Team 2 Players</Label>
              {team2Players.map((player, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={player}
                    onChange={(e) => handlePlayerChange('team2', index, e.target.value)}
                    placeholder={`Player ${index + 1}`}
                  />
                  {team2Players.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemovePlayer('team2', index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddPlayer('team2')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Player
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <Label>Toss Information</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="toss-winner">Toss Winner</Label>
                <Select value={tossWinner} onValueChange={(v: any) => setTossWinner(v)}>
                  <SelectTrigger id="toss-winner">
                    <SelectValue placeholder="Select winner..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="team1">{team1Name || 'Team 1'}</SelectItem>
                    <SelectItem value="team2">{team2Name || 'Team 2'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="toss-decision">Toss Decision</Label>
                <Select value={tossDecision} onValueChange={(v: any) => setTossDecision(v)}>
                  <SelectTrigger id="toss-decision">
                    <SelectValue placeholder="Select decision..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bat">Bat First</SelectItem>
                    <SelectItem value="bowl">Bowl First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Button
            onClick={handleCreateMatch}
            disabled={createMatch.isPending}
            className="w-full"
          >
            {createMatch.isPending ? 'Creating Match...' : 'Create Match'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
