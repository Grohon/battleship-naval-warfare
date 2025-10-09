import { BOARD_SIZE, SHIPS } from '../constants';
import { BoardState, CellState, CellStatus, PlacedShip, Ship, Orientation } from '../types';

/**
 * Creates an empty game board.
 */
export const createEmptyBoard = (): BoardState => {
  return Array(BOARD_SIZE).fill(null).map(() => 
    Array(BOARD_SIZE).fill(null).map(() => ({
      status: CellStatus.EMPTY,
      shipId: null,
    }))
  );
};

/**
 * Checks if a ship placement is valid on the board.
 */
export const canPlaceShip = (board: BoardState, ship: Ship, row: number, col: number, orientation: Orientation): boolean => {
  if (orientation === 'horizontal') {
    if (col + ship.length > BOARD_SIZE) return false;
    for (let i = 0; i < ship.length; i++) {
      if (board[row][col + i].shipId) return false;
    }
  } else {
    if (row + ship.length > BOARD_SIZE) return false;
    for (let i = 0; i < ship.length; i++) {
      if (board[row + i][col].shipId) return false;
    }
  }
  return true;
};

/**
 * Places a ship on the board and returns the new board state and ship positions.
 */
export const placeShipOnBoard = (board: BoardState, ship: Ship, row: number, col: number, orientation: Orientation): { newBoard: BoardState; positions: { row: number; col: number }[] } => {
  const newBoard = board.map(r => r.map(c => ({...c})));
  const positions = [];
  if (orientation === 'horizontal') {
    for (let i = 0; i < ship.length; i++) {
      newBoard[row][col + i] = { status: CellStatus.SHIP, shipId: ship.id };
      positions.push({ row, col: col + i });
    }
  } else {
    for (let i = 0; i < ship.length; i++) {
      newBoard[row + i][col] = { status: CellStatus.SHIP, shipId: ship.id };
      positions.push({ row: row + i, col });
    }
  }
  return { newBoard, positions };
};

/**
 * Randomly places all ships on the board for the computer.
 */
export const placeAllComputerShips = (): { board: BoardState; ships: PlacedShip[] } => {
  let board = createEmptyBoard();
  const placedShips: PlacedShip[] = [];

  for (const ship of SHIPS) {
    let placed = false;
    while (!placed) {
      const orientation: Orientation = Math.random() > 0.5 ? 'horizontal' : 'vertical';
      const row = Math.floor(Math.random() * BOARD_SIZE);
      const col = Math.floor(Math.random() * BOARD_SIZE);

      if (canPlaceShip(board, ship, row, col, orientation)) {
        const { newBoard, positions } = placeShipOnBoard(board, ship, row, col, orientation);
        board = newBoard;
        placedShips.push({ ...ship, positions, sunk: false, orientation });
        placed = true;
      }
    }
  }
  return { board, ships: placedShips };
};

// Helper to check if a cell is valid to target
const isTargetable = (board: BoardState, row: number, col: number): boolean => {
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
        return false; // Out of bounds
    }
    const status = board[row][col].status;
    return status === CellStatus.EMPTY || status === CellStatus.SHIP;
};

/**
 * Determines the computer's next move using a "seek and hunt" algorithm.
 * - Seek Mode: Uses a checkerboard pattern to efficiently find ships.
 * - Hunt Mode: Once a ship is hit, it targets adjacent cells to determine orientation,
 *   then fires along that line until the ship is sunk.
 */
export const getComputerMove = (playerBoard: BoardState, activeHits: { row: number, col: number }[]): { row: number, col: number } => {
    // HUNT MODE: We have active hits to follow up on.
    if (activeHits.length > 0) {
        const potentialMoves: { row: number, col: number }[] = [];

        if (activeHits.length === 1) {
            // First hit, check all four adjacent cells
            const { row, col } = activeHits[0];
            potentialMoves.push({ row: row - 1, col }, { row: row + 1, col }, { row, col: col - 1 }, { row, col: col + 1 });
        } else {
            // Two or more hits, determine orientation and target along that line
            const isHorizontal = activeHits[0].row === activeHits[1].row;
            if (isHorizontal) {
                const row = activeHits[0].row;
                const cols = activeHits.map(h => h.col);
                const minCol = Math.min(...cols);
                const maxCol = Math.max(...cols);
                potentialMoves.push({ row, col: minCol - 1 });
                potentialMoves.push({ row, col: maxCol + 1 });
            } else { // isVertical
                const col = activeHits[0].col;
                const rows = activeHits.map(h => h.row);
                const minRow = Math.min(...rows);
                const maxRow = Math.max(...rows);
                potentialMoves.push({ row: minRow - 1, col });
                potentialMoves.push({ row: maxRow + 1, col });
            }
        }
        
        const validMoves = potentialMoves.filter(move => isTargetable(playerBoard, move.row, move.col));

        if (validMoves.length > 0) {
            return validMoves[Math.floor(Math.random() * validMoves.length)];
        }
        
        // Fallback if linear targeting fails (e.g., ship is at edge of board)
        const fallbackMoves: { row: number, col: number }[] = [];
        activeHits.forEach(hit => {
             fallbackMoves.push(
                { row: hit.row - 1, col: hit.col }, 
                { row: hit.row + 1, col: hit.col }, 
                { row: hit.row, col: hit.col - 1 }, 
                { row: hit.row, col: hit.col + 1 }
             );
        });
        const validFallbackMoves = fallbackMoves.filter(move => isTargetable(playerBoard, move.row, move.col));
        if (validFallbackMoves.length > 0) {
            return validFallbackMoves[Math.floor(Math.random() * validFallbackMoves.length)];
        }
    }

    // SEEK MODE: No active hits, find a new target using a checkerboard pattern.
    const checkerboardCells: { row: number, col: number }[] = [];
    const otherCells: { row: number, col: number }[] = [];
    
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (isTargetable(playerBoard, r, c)) {
                if ((r + c) % 2 === 0) {
                    checkerboardCells.push({ row: r, col: c });
                } else {
                    otherCells.push({ row: r, col: c });
                }
            }
        }
    }

    const preferredTargets = checkerboardCells.length > 0 ? checkerboardCells : otherCells;
    if (preferredTargets.length > 0) {
        return preferredTargets[Math.floor(Math.random() * preferredTargets.length)];
    }

    // Should not be reached if the game is still ongoing.
    return { row: 0, col: 0 };
};

/**
 * Checks if a ship has been sunk.
 */
export const isShipSunk = (board: BoardState, ship: PlacedShip): boolean => {
  return ship.positions.every(({ row, col }) => board[row][col].status === CellStatus.HIT);
};