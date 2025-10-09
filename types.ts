export enum CellStatus {
  EMPTY = 'EMPTY',
  SHIP = 'SHIP',
  HIT = 'HIT',
  MISS = 'MISS',
  SUNK = 'SUNK',
}

export interface CellState {
  status: CellStatus;
  shipId: string | null;
}

export type BoardState = CellState[][];

export interface Ship {
  id: string;
  name: string;
  length: number;
}

export interface PlacedShip extends Ship {
  positions: { row: number; col: number }[];
  sunk: boolean;
  orientation: Orientation;
}

export interface UnplacedShip extends Ship {
  orientation: Orientation;
}

export enum GamePhase {
  PLACEMENT = 'PLACEMENT',
  BATTLE = 'BATTLE',
  GAME_OVER = 'GAME_OVER',
}

export type Player = 'PLAYER' | 'COMPUTER';

export type Orientation = 'horizontal' | 'vertical';

export interface GameStatsData {
  gamesPlayed: number;
  wins: number;
  losses: number;
  totalShots: number;
  totalHits: number;
  fastestWinTime: number | null; // in milliseconds
}
