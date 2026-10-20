
import { Ship } from './types';

export const BOARD_SIZE = 10;

/** Column letters shown on the boards and used in shot messages (A-J). */
export const BOARD_COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

/** Human-readable name of a cell, e.g. column C, row 7 => "C7". */
export const columnLabel = (col: number): string => BOARD_COLUMNS[col] ?? String.fromCharCode(65 + col);

export const SHIPS: Ship[] = [
  { id: 'carrier', name: 'Carrier', length: 5 },
  { id: 'battleship', name: 'Battleship', length: 4 },
  { id: 'cruiser', name: 'Cruiser', length: 3 },
  { id: 'submarine', name: 'Submarine', length: 3 },
  { id: 'destroyer', name: 'Destroyer', length: 2 },
];
