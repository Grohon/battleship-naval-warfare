import React from 'react';
import { UnplacedShip } from '../types';
import ShipComponent from './Ship';

interface ShipPlacementProps {
  ship: UnplacedShip;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, ship: UnplacedShip) => void;
  onTouchStart: (e: React.TouchEvent<HTMLDivElement>, ship: UnplacedShip) => void;
  onDragEnd: () => void;
  onRotate: (shipId: string) => void;
}

const CELL_SIZE_SMALL = 32; // w-8
const GAP_SIZE_SMALL = 2; // gap-0.5
const CELL_SIZE_MEDIUM = 40; // md:w-10
const GAP_SIZE_MEDIUM = 2; // md:gap-0.5

const ShipPlacement: React.FC<ShipPlacementProps> = ({ ship, onDragStart, onTouchStart, onDragEnd, onRotate }) => {

  const getStyle = (isMediumScreen: boolean): React.CSSProperties => {
    const cellSize = isMediumScreen ? CELL_SIZE_MEDIUM : CELL_SIZE_SMALL;
    const gapSize = isMediumScreen ? GAP_SIZE_MEDIUM : GAP_SIZE_SMALL;
    return {
      width: ship.orientation === 'horizontal' ? `${ship.length * (cellSize + gapSize) - gapSize}px` : `${cellSize}px`,
      height: ship.orientation === 'vertical' ? `${ship.length * (cellSize + gapSize) - gapSize}px` : `${cellSize}px`,
    };
  };

  return (
    <div
      draggable
      role="button"
      tabIndex={0}
      aria-label={`${ship.name}, length ${ship.length}. Drag onto your fleet, press Enter to rotate.`}
      onDragStart={(e) => onDragStart(e, ship)}
      onTouchStart={(e) => onTouchStart(e, ship)}
      onDragEnd={onDragEnd}
      onClick={() => onRotate(ship.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onRotate(ship.id);
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onRotate(ship.id);
      }}
      className="m-2 cursor-move transition-transform duration-200 hover:scale-105"
    >
      {/* We need two elements for tailwind's responsive variants to work on style */}
      <div className="hidden md:block">
        <ShipComponent ship={ship} orientation={ship.orientation} style={getStyle(true)}/>
      </div>
      <div className="block md:hidden">
        <ShipComponent ship={ship} orientation={ship.orientation} style={getStyle(false)}/>
      </div>
    </div>
  );
};

export default ShipPlacement;
