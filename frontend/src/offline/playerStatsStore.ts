import type { CumulativePlayerStats } from '../utils/cumulativePlayerStats';

const STORAGE_KEY = 'cricket_player_stats_cache';

/**
 * Load cached player stats from localStorage
 */
export function loadPlayerStatsCache(): Map<string, CumulativePlayerStats> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return new Map();
    
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      console.error('Player stats cache is not an array');
      return new Map();
    }
    
    const map = new Map<string, CumulativePlayerStats>();
    parsed.forEach((item: any) => {
      map.set(item.playerName, item);
    });
    
    return map;
  } catch (error) {
    console.error('Failed to load player stats cache:', error);
    return new Map();
  }
}

/**
 * Save player stats cache to localStorage
 */
export function savePlayerStatsCache(statsMap: Map<string, CumulativePlayerStats>): void {
  try {
    const array = Array.from(statsMap.values());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(array));
  } catch (error) {
    console.error('Failed to save player stats cache:', error);
    throw new Error('Failed to save player stats cache to device storage');
  }
}

/**
 * Get stats for a specific player
 */
export function getPlayerStats(playerName: string): CumulativePlayerStats | null {
  const cache = loadPlayerStatsCache();
  return cache.get(playerName) || null;
}

/**
 * Clear the player stats cache
 */
export function clearPlayerStatsCache(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear player stats cache:', error);
  }
}
