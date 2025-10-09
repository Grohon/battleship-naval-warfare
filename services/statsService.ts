import { GameStatsData } from '../types';

const STATS_STORAGE_KEY = 'battleship_game_stats';

const defaultStats: GameStatsData = {
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  totalShots: 0,
  totalHits: 0,
  fastestWinTime: null,
};

/**
 * Loads game statistics from localStorage.
 * @returns {GameStatsData} The loaded stats or default stats if none are found.
 */
export const loadStats = (): GameStatsData => {
  try {
    const statsJson = localStorage.getItem(STATS_STORAGE_KEY);
    if (statsJson) {
      const parsedStats = JSON.parse(statsJson);
      // Basic validation to ensure the loaded data has the expected shape
      if (typeof parsedStats.gamesPlayed === 'number') {
        return { ...defaultStats, ...parsedStats };
      }
    }
  } catch (error) {
    console.error("Failed to load stats from localStorage:", error);
  }
  return { ...defaultStats };
};

/**
 * Saves game statistics to localStorage.
 * @param {GameStatsData} stats The stats object to save.
 */
export const saveStats = (stats: GameStatsData): void => {
  try {
    const statsJson = JSON.stringify(stats);
    localStorage.setItem(STATS_STORAGE_KEY, statsJson);
  } catch (error) {
    console.error("Failed to save stats to localStorage:", error);
  }
};

/**
 * Resets game statistics in localStorage to their default values.
 */
export const resetStats = (): GameStatsData => {
  try {
    localStorage.removeItem(STATS_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to reset stats in localStorage:", error);
  }
  return { ...defaultStats };
};
