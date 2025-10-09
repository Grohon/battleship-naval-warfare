
import React, { useState, useEffect, useRef } from 'react';
import { BoardState, PlacedShip, UnplacedShip } from '../types';
import { canPlaceShip } from '../services/gameLogic';
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
  onRotatePlacedShip?: (shipId: string) => void;
  disabled: boolean;
  isTurn: boolean;
  draggedShip?: UnplacedShip | null;
  sunkShipPositions?: {row: number, col: number}[];
}

const GAP_SIZE = 2; // Corresponds to gap-0.5 -> 0.125rem * 16px = 2px

const Board: React.FC<BoardProps> = ({ title, board, placedShips, isPlayerBoard, onCellClick, onCellDragOver, onCellDrop, onPlacedShipDragStart, onPlacedShipDragEnd, onRotatePlacedShip, disabled, isTurn, draggedShip, sunkShipPositions }) => {
  const [previewCells, setPreviewCells] = useState<{row: number, col: number}[]>([]);
  const [isPlacementValid, setIsPlacementValid] = useState<boolean>(false);

  const boardClasses = `p-2 bg-navy-900/50 rounded-lg shadow-lg transition-all duration-500 ${isTurn ? 'ring-2 ring-cyan-light animate-pulse' : 'ring-0'} ${
    isPlayerBoard && draggedShip ? 'border-2 border-dashed border-cyan-light/50' : ''
  }`;

  const [cellSize, setCellSize] = useState(40);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateCellSize = () => {
      if (gridRef.current?.firstChild) {
        const cellElement = gridRef.current.firstChild as HTMLElement;
        setCellSize(cellElement.offsetWidth);
      }
    };
    const timeoutId = setTimeout(updateCellSize, 50);
    window.addEventListener('resize', updateCellSize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateCellSize);
    };
  }, []);
  
  useEffect(() => {
    // Clear preview when no ship is being dragged
    if (!draggedShip) {
      setPreviewCells([]);
    }
  }, [draggedShip]);

  const handleInternalDragOver = (e: React.DragEvent<HTMLDivElement>, row: number, col: number) => {
    if (onCellDragOver) onCellDragOver(e, row, col);
    if (!draggedShip) return;

    const positions = [];
    if (draggedShip.orientation === 'horizontal') {
        for (let i = 0; i < draggedShip.length; i++) {
            positions.push({ row, col: col + i });
        }
    } else {
        for (let i = 0; i < draggedShip.length; i++) {
            positions.push({ row: row + i, col });
        }
    }
    
    const isValid = canPlaceShip(board, draggedShip, row, col, draggedShip.orientation);
    setPreviewCells(positions);
    setIsPlacementValid(isValid);
  };

  const handleDragLeave = () => {
    setPreviewCells([]);
  };

  return (
    <div className="flex flex-col items-center space-y-3">
      <h2 className="text-xl font-bold tracking-wider text-slate-light">{title}</h2>
      <div className={boardClasses}>
        <div className="relative" onDragLeave={handleDragLeave}>
          <div ref={gridRef} className="grid grid-cols-10 gap-0.5 bg-navy-700">
            {board.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                const isPreviewing = previewCells.some(p => p.row === rowIndex && p.col === colIndex);
                const isNewlySunk = sunkShipPositions?.some(p => p.row === rowIndex && p.col === colIndex);

                return (
                  <Cell
                    key={`${rowIndex}-${colIndex}`}
                    state={cell}
                    isPlayerBoard={isPlayerBoard}
                    onClick={() => onCellClick && onCellClick(rowIndex, colIndex)}
                    onDragOver={(e) => isPlayerBoard && handleInternalDragOver(e, rowIndex, colIndex)}
                    onDrop={(e) => onCellDrop && onCellDrop(e, rowIndex, colIndex)}
                    disabled={disabled}
                    isPlacementPreview={isPreviewing}
                    isPlacementValid={isPlacementValid}
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

              // Only player ships in placement phase are interactive
              const isInteractive = isPlayerBoard && !disabled;
              
              return (
                <div
                  key={ship.id}
                  draggable={isInteractive}
                  onDragStart={isInteractive ? (e) => onPlacedShipDragStart && onPlacedShipDragStart(e, ship) : undefined}
                  onDragEnd={isInteractive ? onPlacedShipDragEnd : undefined}
                  onClick={() => {
                    if (isInteractive && onRotatePlacedShip) {
                      onRotatePlacedShip(ship.id);
                    }
                  }}
                  onContextMenu={(e) => {
                    if (isInteractive && onRotatePlacedShip) {
                      e.preventDefault();
                      onRotatePlacedShip(ship.id);
                    }
                  }}
                  className={`absolute ${isInteractive ? 'pointer-events-auto cursor-move' : ''}`}
                  style={{
                    top: `${ship.positions[0].row * (cellSize + GAP_SIZE)}px`,
                    left: `${ship.positions[0].col * (cellSize + GAP_SIZE)}px`,
                    width: ship.orientation === 'horizontal' ? `${ship.length * (cellSize + GAP_SIZE) - GAP_SIZE}px` : `${cellSize}px`,
                    height: ship.orientation === 'vertical' ? `${ship.length * (cellSize + GAP_SIZE) - GAP_SIZE}px` : `${cellSize}px`,
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
        </div>
      </div>
    </div>
  );
};

export default Board;
