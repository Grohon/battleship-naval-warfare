import React, { forwardRef } from 'react';
import { UnplacedShip } from '../types';
import ShipComponent from './Ship';

interface DraggableShipGhostProps {
  ship: UnplacedShip;
  position: { x: number; y: number };
}

// These values should roughly match the cell sizes for a consistent look
const CELL_SIZE_MEDIUM = 40; 
const GAP_SIZE_MEDIUM = 2;

const DraggableShipGhost = forwardRef<HTMLDivElement, DraggableShipGhostProps>(
  ({ ship, position }, ref) => {
    const isHorizontal = ship.orientation === 'horizontal';
    
    const width = isHorizontal ? ship.length * (CELL_SIZE_MEDIUM + GAP_SIZE_MEDIUM) - GAP_SIZE_MEDIUM : CELL_SIZE_MEDIUM;
    const height = !isHorizontal ? ship.length * (CELL_SIZE_MEDIUM + GAP_SIZE_MEDIUM) - GAP_SIZE_MEDIUM : CELL_SIZE_MEDIUM;

    const style: React.CSSProperties = {
      position: 'fixed',
      left: `${position.x}px`,
      top: `${position.y}px`,
      transform: 'translate(-50%, -50%)', // Center the ghost on the touch point
      width: `${width}px`,
      height: `${height}px`,
      pointerEvents: 'none',
      zIndex: 1000,
      opacity: 0.8,
      transition: 'opacity 0.2s', // Smooth appearance
    };

    return (
      <div ref={ref} style={style}>
        <ShipComponent ship={ship} orientation={ship.orientation} isPlaced={false} />
      </div>
    );
  }
);

DraggableShipGhost.displayName = 'DraggableShipGhost';

export default DraggableShipGhost;
