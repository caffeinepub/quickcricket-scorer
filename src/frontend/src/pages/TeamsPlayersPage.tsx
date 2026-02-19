import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { loadSavedTeams, saveTeamRoster, deleteTeamRoster, updateTeamRoster } from '../offline/teamRosterStore';
import type { SavedTeamRoster } from '../offline/teamRosterStore';
import type { Team, Player } from '../backend';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Trash2, Edit, Plus, Users, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function TeamsPlayersPage() {
  const navigate = useNavigate();
  const [savedTeams, setSavedTeams] = useState<SavedTeamRoster[]>(loadSavedTeams());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTeam, setEditingTeam] = useState<SavedTeamRoster | null>(null);
  const [teamName, setTeamName] = useState('');
  const [playerNames, setPlayerNames] = useState<string[]>(['', '']);

  const handleLoadTeams = () => {
    setSavedTeams(loadSavedTeams());
  };

  const handleCreateTeam = () => {
    setEditingTeam(null);
    setTeamName('');
    setPlayerNames(['', '']);
    setShowCreateDialog(true);
  };

  const handleEditTeam = (roster: SavedTeamRoster) => {
    setEditingTeam(roster);
    setTeamName(roster.team.name);
    setPlayerNames(roster.team.players.map(p => p.name));
    setShowCreateDialog(true);
  };

  const handleDeleteTeam = (id: string) => {
    try {
      deleteTeamRoster(id);
      toast.success('Team deleted successfully');
      handleLoadTeams();
    } catch (error) {
      toast.error('Failed to delete team');
      console.error('Delete team error:', error);
    }
  };

  const handleSaveTeam = () => {
    if (!teamName.trim()) {
      toast.error('Please enter a team name');
      return;
    }

    const validPlayers = playerNames.filter(name => name.trim() !== '');
    if (validPlayers.length < 2) {
      toast.error('Please enter at least 2 player names');
      return;
    }

    const team: Team = {
      id: editingTeam ? editingTeam.team.id : BigInt(Date.now()),
      name: teamName.trim(),
      players: validPlayers.map((name, index) => ({
        id: BigInt(Date.now() + index),
        name: name.trim(),
        battingOrderPosition: BigInt(index + 1),
      })),
    };

    try {
      if (editingTeam) {
        updateTeamRoster(editingTeam.id, team);
        toast.success('Team updated successfully');
      } else {
        saveTeamRoster(team);
        toast.success('Team saved successfully');
      }
      setShowCreateDialog(false);
      handleLoadTeams();
    } catch (error) {
      toast.error(editingTeam ? 'Failed to update team' : 'Failed to save team');
      console.error('Save team error:', error);
    }
  };

  const handleAddPlayer = () => {
    setPlayerNames([...playerNames, '']);
  };

  const handleRemovePlayer = (index: number) => {
    if (playerNames.length <= 2) {
      toast.error('A team must have at least 2 players');
      return;
    }
    setPlayerNames(playerNames.filter((_, i) => i !== index));
  };

  const handlePlayerNameChange = (index: number, value: string) => {
    const updated = [...playerNames];
    updated[index] = value;
    setPlayerNames(updated);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Teams & Players
              </CardTitle>
              <CardDescription>Manage your saved team rosters</CardDescription>
            </div>
            <Button onClick={() => navigate({ to: '/' })} variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Button onClick={handleCreateTeam} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Create New Team
          </Button>
        </CardContent>
      </Card>

      {savedTeams.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No saved teams yet. Create your first team to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {savedTeams.map(roster => (
            <Card key={roster.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{roster.team.name}</CardTitle>
                    <CardDescription>{roster.team.players.length} players</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleEditTeam(roster)} variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => handleDeleteTeam(roster.id)} variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {roster.team.players.map((player, index) => (
                    <div key={player.id.toString()} className="text-sm">
                      {index + 1}. {player.name}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTeam ? 'Edit Team' : 'Create New Team'}</DialogTitle>
            <DialogDescription>
              Enter team name and player names
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="teamName">Team Name</Label>
              <Input
                id="teamName"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter team name"
              />
            </div>
            <div className="space-y-2">
              <Label>Players</Label>
              {playerNames.map((name, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={name}
                    onChange={(e) => handlePlayerNameChange(index, e.target.value)}
                    placeholder={`Player ${index + 1}`}
                  />
                  {playerNames.length > 2 && (
                    <Button
                      onClick={() => handleRemovePlayer(index)}
                      variant="outline"
                      size="sm"
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button onClick={handleAddPlayer} variant="outline" size="sm" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Player
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowCreateDialog(false)} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleSaveTeam}>
              {editingTeam ? 'Update Team' : 'Save Team'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
