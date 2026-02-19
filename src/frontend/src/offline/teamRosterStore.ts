import type { Team } from '../backend';

const STORAGE_KEY = 'cricket_saved_teams';

export interface SavedTeamRoster {
  id: string;
  team: Team;
  createdAt: number;
  updatedAt: number;
}

/**
 * Load all saved team rosters from localStorage
 */
export function loadSavedTeams(): SavedTeamRoster[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      console.error('Saved teams data is not an array');
      return [];
    }
    
    return parsed.map(deserializeTeamRoster);
  } catch (error) {
    console.error('Failed to load saved teams:', error);
    return [];
  }
}

/**
 * Get a specific saved team by ID
 */
export function getSavedTeam(id: string): SavedTeamRoster | null {
  const teams = loadSavedTeams();
  return teams.find(t => t.id === id) || null;
}

/**
 * Save a new team roster
 */
export function saveTeamRoster(team: Team): SavedTeamRoster {
  const teams = loadSavedTeams();
  const now = Date.now();
  
  const roster: SavedTeamRoster = {
    id: `team_${now}_${Math.random().toString(36).substr(2, 9)}`,
    team,
    createdAt: now,
    updatedAt: now,
  };
  
  teams.push(roster);
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(teams.map(serializeTeamRoster)));
    return roster;
  } catch (error) {
    console.error('Failed to save team roster:', error);
    throw new Error('Failed to save team roster to device storage');
  }
}

/**
 * Update an existing team roster
 */
export function updateTeamRoster(id: string, team: Team): SavedTeamRoster | null {
  const teams = loadSavedTeams();
  const index = teams.findIndex(t => t.id === id);
  
  if (index === -1) {
    return null;
  }
  
  const now = Date.now();
  teams[index] = {
    ...teams[index],
    team,
    updatedAt: now,
  };
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(teams.map(serializeTeamRoster)));
    return teams[index];
  } catch (error) {
    console.error('Failed to update team roster:', error);
    throw new Error('Failed to update team roster on device storage');
  }
}

/**
 * Delete a saved team roster
 */
export function deleteTeamRoster(id: string): boolean {
  const teams = loadSavedTeams();
  const filtered = teams.filter(t => t.id !== id);
  
  if (filtered.length === teams.length) {
    return false; // Not found
  }
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.map(serializeTeamRoster)));
    return true;
  } catch (error) {
    console.error('Failed to delete team roster:', error);
    throw new Error('Failed to delete team roster from device storage');
  }
}

function serializeTeamRoster(roster: SavedTeamRoster): any {
  return {
    id: roster.id,
    team: {
      id: roster.team.id.toString(),
      name: roster.team.name,
      players: roster.team.players.map(p => ({
        id: p.id.toString(),
        name: p.name,
        battingOrderPosition: p.battingOrderPosition?.toString() ?? null,
      })),
    },
    createdAt: roster.createdAt,
    updatedAt: roster.updatedAt,
  };
}

function deserializeTeamRoster(data: any): SavedTeamRoster {
  return {
    id: data.id,
    team: {
      id: BigInt(data.team.id),
      name: data.team.name,
      players: data.team.players.map((p: any) => ({
        id: BigInt(p.id),
        name: p.name,
        battingOrderPosition: p.battingOrderPosition ? BigInt(p.battingOrderPosition) : undefined,
      })),
    },
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}
