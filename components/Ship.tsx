
import React from 'react';
import { Ship, Orientation } from '../types';

interface ShipComponentProps {
    ship: Ship;
    orientation: Orientation;
    style?: React.CSSProperties;
    isPlaced?: boolean;
    isSunk?: boolean;
}

const ShipComponent: React.FC<ShipComponentProps> = ({ ship, orientation, style, isPlaced = false, isSunk = false }) => {
    const isHorizontal = orientation === 'horizontal';
    const scale = 10;

    // Fill the parent box exactly. When a style is supplied (tray tiles) it wins;
    // otherwise the ship stretches to whatever box the parent (board overlay,
    // ghost) provides, so it lines up with the grid cells.
    const wrapperStyle: React.CSSProperties = style ?? { width: '100%', height: '100%' };

    // Define viewBoxes for both orientations.
    const horizontalViewBox = `0 0 ${ship.length * scale} ${scale}`;
    const verticalViewBox = `0 0 ${scale} ${ship.length * scale}`;
    
    // A simplified and correct rotation transform. It pivots the horizontal drawing 
    // by 90 degrees around the center of the first grid cell.
    const rotationTransform = 'rotate(90 5 5)';

    return (
        <div className={`flex items-center justify-center transition-opacity duration-500 ${isSunk ? 'opacity-60' : ''}`} style={wrapperStyle}>
            <svg
                width="100%"
                height="100%"
                viewBox={isHorizontal ? horizontalViewBox : verticalViewBox}
                preserveAspectRatio="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <linearGradient id="hullGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style={{stopColor: '#a8b2d1' /* slate-light */, stopOpacity: 1}} />
                        <stop offset="100%" style={{stopColor: '#8892b0' /* slate-DEFAULT */, stopOpacity: 1}} />
                    </linearGradient>
                </defs>
                <g transform={isHorizontal ? '' : rotationTransform}>
                    {/* Main Hull with a tapered bow and rounded stern */}
                    <path
                        d={`M1,5 
                           C2,2 ${ship.length * 2},2 ${ship.length * 3},2 
                           L${ship.length * scale - 4},2 
                           C${ship.length * scale - 2},2 ${ship.length * scale - 1},3.5 ${ship.length * scale - 1},5 
                           C${ship.length * scale - 1},6.5 ${ship.length * scale - 2},8 ${ship.length * scale - 4},8
                           L${ship.length * 3},8 
                           C${ship.length * 2},8 2,8 1,5 Z`}
                        fill="url(#hullGradient)"
                        stroke={isPlaced ? "#5f6b84" : "none"}
                        strokeWidth="0.4"
                        strokeLinejoin="round"
                    />

                    {/* Superstructure */}
                    <rect
                        x={ship.length * scale * 0.4}
                        y="3.5"
                        width={ship.length * scale * 0.3}
                        height="3"
                        rx="1"
                        fill="#233554" // navy-700
                        stroke={isPlaced ? "#a8b2d1" : "none"}
                        strokeWidth="0.3"
                    />

                    {/* Main Gun Turret */}
                    <circle
                        cx={ship.length * scale * 0.25}
                        cy="5"
                        r="1.2"
                        fill="#233554"
                        stroke={isPlaced ? "#a8b2d1" : "none"}
                        strokeWidth="0.3"
                    />

                    {/* Aft Gun Turret for longer ships */}
                    {ship.length > 3 && (
                         <circle
                            cx={ship.length * scale * 0.8}
                            cy="5"
                            r="1.2"
                            fill="#233554"
                            stroke={isPlaced ? "#a8b2d1" : "none"}
                            strokeWidth="0.3"
                        />
                    )}
                </g>
            </svg>
        </div>
    );
};

export default ShipComponent;
