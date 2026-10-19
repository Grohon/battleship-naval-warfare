import React from 'react';
import { UnplacedShip } from '../types';
import ShipComponent from './Ship';

interface ShipPlacementProps {
  ship: UnplacedShip;
  /** Measured cell size of the board, so the tray tiles match it on every screen. */
  cellSize: number;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, ship: UnplacedShip) => void;
  onTouchStart: (e: React.TouchEvent<HTMLDivElement>, ship: UnplacedShip) => void;
  onDragEnd: () => void;
  onRotate: (shipId: string) => void;
}

const GAP_SIZE = 2; // gap-0.5

const ShipPlacement: React.FC<ShipPlacementProps> = ({ ship, cellSize, onDragStart, onTouchStart, onDragEnd, onRotate }) => {
  const span = ship.length * (cellSize + GAP_SIZE) - GAP_SIZE;
  const style: React.CSSProperties = {
    width: ship.orientation === 'horizontal' ? span : cellSize,
    height: ship.orientation === 'vertical' ? span : cellSize,
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
      <ShipComponent ship={ship} orientation={ship.orientation} style={style}/>
    </div>
  );
};

export default ShipPlacement;
