import React, { useState, useEffect, useRef } from 'react';
import { BoardState, PlacedShip, UnplacedShip } from '../types';
import Cell from './Cell';
import ShipComponent from './Ship';

interface BoardProps {
  title: string;
  board: BoardState;
  placedShips: PlacedShip[];
  isPlayerBoard: boolean;
  onCellClick?: (row: number, col: number) => void;
  onCellDragOver?: (e: React.DragEvent<HTMLDivElement>, row: number, col: number) => void;
  onCellDrop?: (e: React.DragEvent<HTMLDivElement>, row: number, col: number) => void;
  onPlacedShipDragStart?: (e: React.DragEvent<HTMLDivElement>, ship: PlacedShip) => void;
  onPlacedShipDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
  onPlacedShipTouchStart?: (e: React.TouchEvent<HTMLDivElement>, ship: PlacedShip) => void;
  onRotatePlacedShip?: (shipId: string) => void;
  disabled: boolean;
  isTurn: boolean;
  draggedShip?: UnplacedShip | null;
  isTouchDrag?: boolean;
  sunkShipPositions?: {row: number, col: number}[];
  previewCells?: {row: number, col: number}[];
  isPlacementValid?: boolean;
  onCellMeasure?: (metrics: { cell: number; pitch: number }) => void;
}

const GAP_SIZE = 2; // Corresponds to gap-0.5 -> 0.125rem * 16px = 2px

const Board: React.FC<BoardProps> = ({ title, board, placedShips, isPlayerBoard, onCellClick, onCellDragOver, onCellDrop, onPlacedShipDragStart, onPlacedShipDragEnd, onPlacedShipTouchStart, onRotatePlacedShip, disabled, isTurn, draggedShip, isTouchDrag, sunkShipPositions, previewCells, isPlacementValid, onCellMeasure }) => {
  // The border is always present (transparent when idle) so the board does not
  // shift or resize while a ship is being dragged.
  const boardClasses = `p-2 bg-navy-900/50 rounded-lg shadow-lg transition-all duration-500 border-2 ${
    isPlayerBoard && draggedShip ? 'border-dashed border-cyan-light/50' : 'border-transparent'
  } ${isTurn ? 'ring-2 ring-cyan-light animate-pulse' : ''}`;

  const [cellSize, setCellSize] = useState(40);
  const [cellPitch, setCellPitch] = useState(40 + GAP_SIZE);
  const gridRef = useRef<HTMLDivElement>(null);
  const onCellMeasureRef = useRef(onCellMeasure);
  onCellMeasureRef.current = onCellMeasure;

  // Measure the real cell size and the distance between two neighbouring cells
  // (cell + gap). A ResizeObserver keeps this in sync with breakpoint changes
  // and with late-applied styles (e.g. the Tailwind CDN loading after mount).
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const measure = () => {
      const first = grid.children[0] as HTMLElement | undefined;
      if (!first) return;
      const second = grid.children[1] as HTMLElement | undefined;

      const cell = first.offsetWidth || Math.round(first.getBoundingClientRect().width);
      let pitch = cell + GAP_SIZE;
      if (second) {
        const dx = second.getBoundingClientRect().left - first.getBoundingClientRect().left;
        if (dx > 0) pitch = dx;
      }

      setCellSize(prev => (prev === cell ? prev : cell));
      setCellPitch(prev => (prev === pitch ? prev : pitch));
      onCellMeasureRef.current?.({ cell, pitch });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(grid);
    return () => observer.disconnect();
  }, []);

  const shipBox = (length: number, orientation: 'horizontal' | 'vertical') => ({
    width: orientation === 'horizontal' ? (length - 1) * cellPitch + cellSize : cellSize,
    height: orientation === 'vertical' ? (length - 1) * cellPitch + cellSize : cellSize,
  });

  // Drag/drop is resolved geometrically from the pointer position. Ships stay
  // interactive at all times (their overlays are pointer-events-auto even while
  // dragging), so relying on which element happens to receive the event would
  // miss drags that pass over a ship. Deriving the cell from coordinates keeps
  // hover, preview and drop consistent no matter what is under the cursor.
  const cellAtPoint = (clientX: number, clientY: number) => {
    const grid = gridRef.current;
    if (!grid) return null;
    const rect = grid.getBoundingClientRect();
    // A little slack around the grid keeps drops in the board padding forgiving.
    if (
      clientX < rect.left - cellPitch / 2 || clientX > rect.right + cellPitch / 2 ||
      clientY < rect.top - cellPitch / 2 || clientY > rect.bottom + cellPitch / 2
    ) {
      return null;
    }
    const rows = board.length;
    const cols = board[0]?.length ?? 0;
    if (!rows || !cols) return null;
    const row = Math.max(0, Math.min(rows - 1, Math.floor((clientY - rect.top) / cellPitch)));
    const col = Math.max(0, Math.min(cols - 1, Math.floor((clientX - rect.left) / cellPitch)));
    return { row, col };
  };

  const handleBoardDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isPlayerBoard || disabled || !draggedShip || !onCellDragOver) return;
    e.preventDefault();
    const cell = cellAtPoint(e.clientX, e.clientY);
    if (cell) onCellDragOver(e, cell.row, cell.col);
  };

  const handleBoardDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isPlayerBoard || disabled || !draggedShip || !onCellDrop) return;
    e.preventDefault();
    const cell = cellAtPoint(e.clientX, e.clientY);
    if (cell) onCellDrop(e, cell.row, cell.col);
  };

  return (
    <div className="flex flex-col items-center space-y-3">
      <h2 className="text-xl font-bold tracking-wider text-slate-light">{title}</h2>
      <div
        className={boardClasses}
        data-board-container={isPlayerBoard ? 'player' : 'enemy'}
        onDragOver={isPlayerBoard ? handleBoardDragOver : undefined}
        onDrop={isPlayerBoard ? handleBoardDrop : undefined}
      >
        <div className="relative">
          <div ref={gridRef} className="grid grid-cols-10 gap-0.5 bg-navy-700">
            {board.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                const isPreviewing = previewCells?.some(p => p.row === rowIndex && p.col === colIndex);
                const isNewlySunk = sunkShipPositions?.some(p => p.row === rowIndex && p.col === colIndex);

                return (
                  <Cell
                    key={`${rowIndex}-${colIndex}`}
                    state={cell}
                    row={rowIndex}
                    col={colIndex}
                    isPlayerBoard={isPlayerBoard}
                    onClick={() => onCellClick && onCellClick(rowIndex, colIndex)}
                    disabled={disabled}
                    isPlacementPreview={isPreviewing}
                    isPlacementValid={isPlacementValid ?? false}
                    isNewlySunk={isNewlySunk}
                  />
                );
              })
            )}
          </div>
          <div className="absolute top-0 left-0 pointer-events-none">
            {placedShips.map(ship => {
              // Player board shows all ships. Enemy board shows only sunk ships.
              const isVisible = isPlayerBoard || ship.sunk;
              if (!isVisible) return null;

              // Player ships stay interactive throughout a placement drag.
              // Flipping draggable/pointer-events on the drag source mid-drag
              // cancels the browser's native drag session, so interactivity only
              // changes when the phase or the input mode changes. (On touch there
              // is no native session, and ships must not block elementFromPoint.)
              const isInteractive = isPlayerBoard && !disabled && !isTouchDrag;

              const box = shipBox(ship.length, ship.orientation);
              // The ship stays in place until a valid drop, so it is dimmed
              // while it is the one being dragged to show it is in flight.
              const isBeingDragged = draggedShip?.id === ship.id;

              return (
                <div
                  key={ship.id}
                  draggable={isInteractive}
                  onDragStart={isInteractive ? (e) => onPlacedShipDragStart && onPlacedShipDragStart(e, ship) : undefined}
                  onDragEnd={isPlayerBoard && !disabled ? onPlacedShipDragEnd : undefined}
                  onTouchStart={isInteractive ? (e) => onPlacedShipTouchStart && onPlacedShipTouchStart(e, ship) : undefined}
                  role={isInteractive ? 'button' : undefined}
                  tabIndex={isInteractive ? 0 : undefined}
                  aria-label={isInteractive ? `${ship.name}, placed. Drag to move, press Enter to rotate.` : undefined}
                  onClick={() => {
                    if (isInteractive && onRotatePlacedShip) {
                      onRotatePlacedShip(ship.id);
                    }
                  }}
                  onKeyDown={isInteractive ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onRotatePlacedShip?.(ship.id);
                    }
                  } : undefined}
                  onContextMenu={(e) => {
                    if (isInteractive && onRotatePlacedShip) {
                      e.preventDefault();
                      onRotatePlacedShip(ship.id);
                    }
                  }}
                  className={`absolute transition-opacity duration-200 ${isInteractive ? 'pointer-events-auto cursor-move' : ''} ${isBeingDragged ? 'opacity-30' : 'opacity-100'}`}
                  style={{
                    top: `${ship.positions[0].row * cellPitch}px`,
                    left: `${ship.positions[0].col * cellPitch}px`,
                    width: `${box.width}px`,
                    height: `${box.height}px`,
                  }}
                >
                  <ShipComponent 
                    ship={ship} 
                    orientation={ship.orientation} 
                    isPlaced={true}
                    isSunk={ship.sunk}
                  />
                </div>
              )
            })}
          </div>

          {/* Snapped drag ghost: rendered exactly over the preview cells so the
              visual always matches where the ship will be dropped. Mouse only —
              on touch the finger-following ghost already shows the grab point. */}
          {isPlayerBoard && !isTouchDrag && draggedShip && previewCells && previewCells.length > 0 && (
            <div
              className={`absolute pointer-events-none ${isPlacementValid ? 'opacity-90' : 'opacity-60'}`}
              style={{
                top: `${previewCells[0].row * cellPitch}px`,
                left: `${previewCells[0].col * cellPitch}px`,
                ...shipBox(draggedShip.length, draggedShip.orientation),
              }}
            >
              <ShipComponent ship={draggedShip} orientation={draggedShip.orientation} isPlaced={false} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Board;
