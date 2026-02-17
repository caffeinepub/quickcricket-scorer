import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MobileSafeSelectContent } from '@/components/mobile/MobileSafeSelectContent';
import { Separator } from '@/components/ui/separator';
import { X, Plus, Users, Smartphone } from 'lucide-react';
import { useCreateMatch, useStartInnings } from '../hooks/useQueries';
import { useConnectivity } from '../hooks/useConnectivity';
import { toast } from 'sonner';
import type { Team } from '../backend';

export default function MatchSetupPage() {
  const navigate = useNavigate();
  const createMatch = useCreateMatch();
  const startInnings = useStartInnings();
  const { isOffline } = useConnectivity();

  const [oversMode, setOversMode] = useState<'preset' | 'custom' | 'unlimited'>('preset');
  const [presetOvers, setPresetOvers] = useState<string>('20');
  const [customOvers, setCustomOvers] = useState<string>('');
  const [oversError, setOversError] = useState<string>('');
  const [team1Name, setTeam1Name] = useState('');
  const [team2Name, setTeam2Name] = useState('');
  const [team1Players, setTeam1Players] = useState<string[]>(['']);
  const [team2Players, setTeam2Players] = useState<string[]>(['']);
  const [striker1, setStriker1] = useState('');
  const [striker2, setStriker2] = useState('');
  const [openingBowler, setOpeningBowler] = useState('');

  const addPlayer = (team: 1 | 2) => {
    if (team === 1) {
      setTeam1Players([...team1Players, '']);
    } else {
      setTeam2Players([...team2Players, '']);
    }
  };

  const removePlayer = (team: 1 | 2, index: number) => {
    if (team === 1) {
      setTeam1Players(team1Players.filter((_, i) => i !== index));
    } else {
      setTeam2Players(team2Players.filter((_, i) => i !== index));
    }
  };

  const updatePlayer = (team: 1 | 2, index: number, value: string) => {
    if (team === 1) {
      const updated = [...team1Players];
      updated[index] = value;
      setTeam1Players(updated);
    } else {
      const updated = [...team2Players];
      updated[index] = value;
      setTeam2Players(updated);
    }
  };

  const handlePresetClick = (value: string) => {
    setOversMode('preset');
    setPresetOvers(value);
    setOversError('');
  };

  const handleCustomOversChange = (value: string) => {
    setOversMode('custom');
    setCustomOvers(value);
    setOversError('');
  };

  const handleUnlimitedClick = () => {
    setOversMode('unlimited');
    setOversError('');
  };

  const validateAndGetOvers = (): bigint | null | undefined => {
    if (oversMode === 'unlimited') {
      return null;
    }

    if (oversMode === 'preset') {
      return BigInt(presetOvers);
    }

    // Custom mode validation
    if (!customOvers.trim()) {
      setOversError('Please enter a number of overs');
      return undefined;
    }

    const parsed = Number(customOvers);
    if (isNaN(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
      setOversError('Please enter a positive whole number');
      return undefined;
    }

    return BigInt(parsed);
  };

  const handleStartMatch = async () => {
    // Validation
    if (!team1Name.trim() || !team2Name.trim()) {
      toast.error('Please enter both team names');
      return;
    }

    const validTeam1Players = team1Players.filter((p) => p.trim());
    const validTeam2Players = team2Players.filter((p) => p.trim());

    if (validTeam1Players.length < 2) {
      toast.error('Team 1 needs at least 2 players');
      return;
    }

    if (validTeam2Players.length < 1) {
      toast.error('Team 2 needs at least 1 player (bowler)');
      return;
    }

    if (!striker1 || !striker2) {
      toast.error('Please select both opening batters');
      return;
    }

    if (!openingBowler) {
      toast.error('Please select the opening bowler');
      return;
    }

    // Validate overs
    const overs = validateAndGetOvers();
    if (overs === undefined) {
      return; // Error already set
    }

    let matchId: bigint | null = null;

    try {
      // Create teams
      const team1: Team = {
        id: BigInt(1),
        name: team1Name.trim(),
        players: validTeam1Players.map((name, idx) => ({
          id: BigInt(idx + 1),
          name: name.trim(),
          battingOrderPosition: BigInt(idx + 1),
        })),
      };

      const team2: Team = {
        id: BigInt(2),
        name: team2Name.trim(),
        players: validTeam2Players.map((name, idx) => ({
          id: BigInt(idx + 1),
          name: name.trim(),
          battingOrderPosition: BigInt(idx + 1),
        })),
      };

      // Create match with overs
      try {
        matchId = await createMatch.mutateAsync({ teams: [team1, team2], oversPerInnings: overs });
      } catch (createError) {
        const errorMessage = createError instanceof Error ? createError.message : 'Failed to create match';
        toast.error(`Match creation failed: ${errorMessage}`);
        console.error('Match creation failed:', createError);
        return;
      }

      // Start first innings with overs
      try {
        await startInnings.mutateAsync({
          matchId,
          battingTeam: team1,
          bowlingTeam: team2,
          overs,
        });
      } catch (inningsError) {
        const errorMessage = inningsError instanceof Error ? inningsError.message : 'Failed to start innings';
        toast.error(`Starting innings failed: ${errorMessage}`);
        console.error('Innings start failed:', inningsError);
        return;
      }

      // Success - navigate to match
      if (isOffline) {
        toast.success('Match created and saved on this device');
      } else {
        toast.success('Match created successfully!');
      }
      
      try {
        navigate({ to: `/match/${matchId}` });
      } catch (navError) {
        console.error('Navigation to match failed:', navError);
        toast.error('Match created but navigation failed. Check the dashboard.');
      }
    } catch (error) {
      // Catch-all for unexpected errors
      const errorMessage = error instanceof Error ? error.message : 'Unexpected error during match setup';
      toast.error(errorMessage);
      console.error('Unexpected error during match setup:', error);
    }
  };

  const validTeam1Players = team1Players.filter((p) => p.trim());
  const validTeam2Players = team2Players.filter((p) => p.trim());

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold">New Match Setup</h2>
        <p className="text-sm sm:text-base text-muted-foreground">Set up your match in under a minute</p>
      </div>

      {/* Offline mode callout */}
      {isOffline && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-start gap-3">
              <Smartphone className="h-5 w-5 text-amber-700 mt-0.5 shrink-0" />
              <div className="space-y-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-amber-900">Creating Match Offline</p>
                <p className="text-xs sm:text-sm text-amber-700">
                  This match will be created locally and saved on this device. It will remain available after you refresh the page. Log in when online to sync matches to the cloud.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Match Format</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Select the number of overs per innings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {['5', '10', '20', '50'].map((option) => (
              <Button
                key={option}
                variant={oversMode === 'preset' && presetOvers === option ? 'default' : 'outline'}
                onClick={() => handlePresetClick(option)}
                size="sm"
              >
                {option} Overs
              </Button>
            ))}
            <Button
              variant={oversMode === 'unlimited' ? 'default' : 'outline'}
              onClick={handleUnlimitedClick}
              size="sm"
            >
              Unlimited
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="custom-overs" className="text-xs sm:text-sm">Or enter custom overs</Label>
            <Input
              id="custom-overs"
              type="number"
              min="1"
              step="1"
              placeholder="e.g., 12 or 15"
              value={customOvers}
              onChange={(e) => handleCustomOversChange(e.target.value)}
              className={oversError ? 'border-destructive' : ''}
            />
            {oversError && <p className="text-xs sm:text-sm text-destructive">{oversError}</p>}
          </div>
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
              Team 1
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Team Name</Label>
              <Input
                value={team1Name}
                onChange={(e) => setTeam1Name(e.target.value)}
                placeholder="e.g., Mumbai Indians"
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Players</Label>
              {team1Players.map((player, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    value={player}
                    onChange={(e) => updatePlayer(1, idx, e.target.value)}
                    placeholder={`Player ${idx + 1}`}
                  />
                  {team1Players.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removePlayer(1, idx)} className="shrink-0">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => addPlayer(1)} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Player
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
              Team 2
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Team Name</Label>
              <Input
                value={team2Name}
                onChange={(e) => setTeam2Name(e.target.value)}
                placeholder="e.g., Chennai Super Kings"
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Players</Label>
              {team2Players.map((player, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    value={player}
                    onChange={(e) => updatePlayer(2, idx, e.target.value)}
                    placeholder={`Player ${idx + 1}`}
                  />
                  {team2Players.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removePlayer(2, idx)} className="shrink-0">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => addPlayer(2)} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Player
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Opening Players</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Select the opening batters and bowler</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Striker (Team 1)</Label>
              <Select value={striker1} onValueChange={setStriker1}>
                <SelectTrigger>
                  <SelectValue placeholder="Select striker" />
                </SelectTrigger>
                <MobileSafeSelectContent>
                  {validTeam1Players.map((player, idx) => (
                    <SelectItem key={idx} value={player}>
                      {player}
                    </SelectItem>
                  ))}
                </MobileSafeSelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Non-Striker (Team 1)</Label>
              <Select value={striker2} onValueChange={setStriker2}>
                <SelectTrigger>
                  <SelectValue placeholder="Select non-striker" />
                </SelectTrigger>
                <MobileSafeSelectContent>
                  {validTeam1Players.map((player, idx) => (
                    <SelectItem key={idx} value={player}>
                      {player}
                    </SelectItem>
                  ))}
                </MobileSafeSelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Opening Bowler (Team 2)</Label>
              <Select value={openingBowler} onValueChange={setOpeningBowler}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bowler" />
                </SelectTrigger>
                <MobileSafeSelectContent>
                  {validTeam2Players.map((player, idx) => (
                    <SelectItem key={idx} value={player}>
                      {player}
                    </SelectItem>
                  ))}
                </MobileSafeSelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <Button variant="outline" onClick={() => navigate({ to: '/' })} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={handleStartMatch}
          disabled={createMatch.isPending || startInnings.isPending}
          className="flex-1"
        >
          {createMatch.isPending || startInnings.isPending ? 'Creating Match...' : 'Start Match'}
        </Button>
      </div>
    </div>
  );
}
