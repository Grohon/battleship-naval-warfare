import React from 'react';
import { CellState, CellStatus } from '../types';

interface CellProps {
  state: CellState;
  row: number;
  col: number;
  isPlayerBoard: boolean;
  onClick: () => void;
  disabled: boolean;
  isPlacementPreview?: boolean;
  isPlacementValid?: boolean;
  isNewlySunk?: boolean;
}

const Cell: React.FC<CellProps> = ({ state, row, col, isPlayerBoard, onClick, disabled, isPlacementPreview, isPlacementValid, isNewlySunk }) => {
  const getCellClasses = () => {
    // Fluid cells: the grid divides whatever width the board has, so the board
    // scales down to fit small screens and is capped on large ones. All
    // pixel-based overlays read the measured size instead of assuming one.
    let baseClasses = 'w-full aspect-square border border-navy-700 transition-all duration-300';

    if (isNewlySunk) {
      return baseClasses + ' animate-sunkFlash';
    }

    if (isPlacementPreview) {
      baseClasses += isPlacementValid ? ' bg-cyan-light/30 border-cyan-light' : ' bg-red-500/30 border-red-500';
      return baseClasses;
    }
    
    switch (state.status) {
      case CellStatus.EMPTY:
        baseClasses += ' bg-navy-800';
        break;
      case CellStatus.SHIP:
        // Use a subtle background for player ships so the overlaid SVG is visible
        baseClasses += isPlayerBoard ? ' bg-cyan-light/10' : ' bg-navy-800';
        break;
      case CellStatus.HIT:
        baseClasses += ' bg-red-500 animate-pulse';
        break;
      case CellStatus.MISS:
        baseClasses += ' bg-slate-DEFAULT/50';
        break;
      case CellStatus.SUNK:
        baseClasses += ' bg-red-800';
        break;
    }

    if (!isPlayerBoard && !disabled && state.status !== CellStatus.HIT && state.status !== CellStatus.MISS && state.status !== CellStatus.SUNK) {
      baseClasses += ' cursor-pointer hover:bg-cyan-light/20';
    } else if (isPlayerBoard && !disabled) {
        baseClasses += ' hover:bg-navy-700/80'; // For placement hover effects
    }
    
    return baseClasses;
  };

  return (
    <div
      className={getCellClasses()}
      onClick={!disabled ? onClick : undefined}
      data-row={row}
      data-col={col}
      data-board={isPlayerBoard ? 'player' : 'enemy'}
    />
  );
};

export default Cell;
