
import React from 'react';
import { PlacedShip, Ship } from '../types';
import { SHIPS } from '../constants';
import ShipComponent from './Ship';

interface FleetStatusProps {
    playerShips: PlacedShip[];
    computerShips: PlacedShip[];
}

// The silhouette leads the row: it is the visual anchor the eye lands on,
// while the length pips line up on the right for quick comparison. The icon
// slot has a fixed width so every ship name starts at the same x, and each
// silhouette keeps its true length-to-height ratio, like a tiny line-up.
const SHIP_ICON_HEIGHT = 12;

const ShipStatusIcon: React.FC<{ ship: Ship, sunk: boolean }> = ({ ship, sunk }) => (
    <div className={`flex items-center p-2 rounded-md transition-all duration-300 ${sunk ? 'bg-red-800/50' : 'bg-navy-700/70'}`}>
        <div
            aria-hidden="true"
            className={`flex-none flex items-center w-16 mr-2 transition-all duration-300 ${sunk ? 'opacity-40 grayscale' : 'opacity-90'}`}
        >
            <ShipComponent
                ship={ship}
                orientation="horizontal"
                isPlaced={true}
                style={{ width: ship.length * SHIP_ICON_HEIGHT, height: SHIP_ICON_HEIGHT }}
            />
        </div>
        <span className={`font-semibold text-sm md:text-base ${sunk ? 'line-through text-slate-DEFAULT' : 'text-slate-light'}`}>
            {ship.name}
        </span>
        <div className="flex ml-auto">
            {Array(ship.length).fill(0).map((_, i) => (
                <div key={i} className={`w-2 h-2 md:w-3 md:h-3 rounded-full ml-1 ${sunk ? 'bg-red-400' : 'bg-cyan-light'}`}></div>
            ))}
        </div>
    </div>
);

const FleetStatus: React.FC<FleetStatusProps> = ({ playerShips, computerShips }) => {
    const getShipSunkStatus = (shipList: PlacedShip[], masterShipList: typeof SHIPS) => {
        return masterShipList.map(baseShip => {
            const shipInstance = shipList.find(s => s.id === baseShip.id);
            return {
                ...baseShip,
                sunk: shipInstance ? shipInstance.sunk : false,
            };
        });
    };
    
    const playerFleetStatus = getShipSunkStatus(playerShips, SHIPS);
    const computerFleetStatus = getShipSunkStatus(computerShips, SHIPS);

    return (
        <div className="mt-8 p-4 bg-navy-800/70 rounded-lg shadow-xl w-full max-w-4xl animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-light mb-3 text-center">Your Fleet</h3>
                    <div className="grid grid-cols-1 gap-2">
                        {playerFleetStatus.map(ship => (
                            <ShipStatusIcon key={ship.id} ship={ship} sunk={ship.sunk} />
                        ))}
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-light mb-3 text-center">Enemy Fleet</h3>
                    <div className="grid grid-cols-1 gap-2">
                        {computerFleetStatus.map(ship => (
                            <ShipStatusIcon key={ship.id} ship={ship} sunk={ship.sunk} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FleetStatus;
