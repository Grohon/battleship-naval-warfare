import React, { forwardRef } from 'react';
import { UnplacedShip } from '../types';
import ShipComponent from './Ship';

interface DraggableShipGhostProps {
  ship: UnplacedShip;
  position: { x: number; y: number };
  /** Which cell of the ship (along its orientation) is under the pointer. */
  grabOffset?: { r: number; c: number };
  /** Measured cell size and cell+gap pitch of the real board. */
  cellSize?: number;
  cellPitch?: number;
}

const DraggableShipGhost = forwardRef<HTMLDivElement, DraggableShipGhostProps>(
  ({ ship, position, grabOffset = { r: 0, c: 0 }, cellSize = 40, cellPitch = 42 }, ref) => {
    const isHorizontal = ship.orientation === 'horizontal';

    const width = isHorizontal ? (ship.length - 1) * cellPitch + cellSize : cellSize;
    const height = !isHorizontal ? (ship.length - 1) * cellPitch + cellSize : cellSize;

    // Center the grabbed cell of the ship on the pointer, so the ghost lines up
    // with the anchor cell used for previews and drops.
    const offsetX = isHorizontal ? grabOffset.c * cellPitch + cellSize / 2 : cellSize / 2;
    const offsetY = !isHorizontal ? grabOffset.r * cellPitch + cellSize / 2 : cellSize / 2;

    const style: React.CSSProperties = {
      position: 'fixed',
      left: `${position.x}px`,
      top: `${position.y}px`,
      transform: `translate(${-offsetX}px, ${-offsetY}px)`,
      width: `${width}px`,
      height: `${height}px`,
      pointerEvents: 'none',
      zIndex: 1000,
      opacity: 0.85,
      transition: 'opacity 0.2s', // Smooth appearance
    };

    return (
      <div ref={ref} style={style} aria-hidden="true">
        <ShipComponent ship={ship} orientation={ship.orientation} isPlaced={false} />
      </div>
    );
  }
);

DraggableShipGhost.displayName = 'DraggableShipGhost';

export default DraggableShipGhost;
