import React from 'react';
import { CellState, CellStatus } from '../types';

interface CellProps {
  state: CellState;
  row: number;
  col: number;
  isPlayerBoard: boolean;
  onClick: () => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
  disabled: boolean;
  isPlacementPreview?: boolean;
  isPlacementValid?: boolean;
  isNewlySunk?: boolean;
}

const Cell: React.FC<CellProps> = ({ state, row, col, isPlayerBoard, onClick, onDragOver, onDrop, disabled, isPlacementPreview, isPlacementValid, isNewlySunk }) => {
  const getCellClasses = () => {
    let baseClasses = 'w-8 h-8 md:w-10 md:h-10 border border-navy-700 transition-all duration-300';

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
    } else if (isPlayerBoard && onDrop) {
        baseClasses += ' hover:bg-navy-700/80'; // For placement hover effects
    }
    
    return baseClasses;
  };

  return (
    <div
      className={getCellClasses()}
      onClick={!disabled ? onClick : undefined}
      onDragOver={onDragOver}
      onDrop={onDrop}
      data-row={row}
      data-col={col}
    />
  );
};

export default Cell;
