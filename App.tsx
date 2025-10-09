import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SHIPS } from './constants';
import { BoardState, CellStatus, GamePhase, PlacedShip, Player, UnplacedShip, Orientation, GameStatsData } from './types';
import { createEmptyBoard, placeAllComputerShips, canPlaceShip, placeShipOnBoard, getComputerMove, isShipSunk } from './services/gameLogic';
import { loadStats, saveStats, resetStats } from './services/statsService';
import Board from './components/Board';
import GameStatus from './components/GameStatus';
import ShipPlacement from './components/ShipPlacement';
import FleetStatus from './components/FleetStatus';
import GameStats from './components/GameStats';
import DraggableShipGhost from './components/DraggableShipGhost';

const App: React.FC = () => {
    const [phase, setPhase] = useState<GamePhase>(GamePhase.PLACEMENT);
    const [playerBoard, setPlayerBoard] = useState<BoardState>(createEmptyBoard());
    const [computerBoard, setComputerBoard] = useState<BoardState>(createEmptyBoard());
    const [playerShips, setPlayerShips] = useState<PlacedShip[]>([]);
    const [computerShips, setComputerShips] = useState<PlacedShip[]>([]);
    const [turn, setTurn] = useState<Player>('PLAYER');
    const [winner, setWinner] = useState<Player | null>(null);
    const [message, setMessage] = useState('Place your ships. Tap or right-click a ship to rotate it.');
    const [computerActiveHits, setComputerActiveHits] = useState<{row: number, col: number}[]>([]);
    const [unplacedPlayerShips, setUnplacedPlayerShips] = useState<UnplacedShip[]>([]);
    const [sunkShipInfo, setSunkShipInfo] = useState<{ player: Player; positions: {row: number, col: number}[] } | null>(null);
    
    // Drag & Drop State (Mouse and Touch)
    const [draggedShip, setDraggedShip] = useState<UnplacedShip | null>(null);
    const [isTouchDragging, setIsTouchDragging] = useState(false);
    const [ghostPosition, setGhostPosition] = useState<{ x: number, y: number } | null>(null);
    const ghostRef = useRef<HTMLDivElement>(null);

    // Placement Preview State
    const [previewCells, setPreviewCells] = useState<{row: number, col: number}[]>([]);
    const [isPlacementValid, setIsPlacementValid] = useState<boolean>(false);
    
    // Stats state
    const [stats, setStats] = useState<GameStatsData>(loadStats());
    const [isStatsVisible, setIsStatsVisible] = useState(false);
    const [playerShots, setPlayerShots] = useState<{ hits: number; total: number }>({ hits: 0, total: 0 });
    const [gameStartTime, setGameStartTime] = useState<number | null>(null);

    const clearPreview = useCallback(() => {
        setPreviewCells([]);
    }, []);

    const handleGameOver = useCallback((gameWinner: Player) => {
        setWinner(gameWinner);
        setPhase(GamePhase.GAME_OVER);
        
        const newStats: GameStatsData = { ...stats };
        newStats.gamesPlayed++;
        newStats.totalShots += playerShots.total;
        newStats.totalHits += playerShots.hits;

        if (gameWinner === 'PLAYER') {
            newStats.wins++;
            setMessage('Congratulations, you have won!');
            if (gameStartTime) {
                const gameDuration = Date.now() - gameStartTime;
                if (newStats.fastestWinTime === null || gameDuration < newStats.fastestWinTime) {
                    newStats.fastestWinTime = gameDuration;
                }
            }
        } else {
            newStats.losses++;
            setMessage('The computer has won. Better luck next time.');
        }

        saveStats(newStats);
        setStats(newStats);

    }, [stats, playerShots, gameStartTime]);

    const setupNewGame = useCallback(() => {
        setPhase(GamePhase.PLACEMENT);
        setPlayerBoard(createEmptyBoard());
        setPlayerShips([]);
        setUnplacedPlayerShips(SHIPS.map(ship => ({ ...ship, orientation: 'horizontal' })));
        const { board: compBoard, ships: compShips } = placeAllComputerShips();
        setComputerBoard(compBoard);
        setComputerShips(compShips);
        setTurn('PLAYER');
        setWinner(null);
        setMessage('Place your ships. Tap or right-click a ship to rotate it.');
        setComputerActiveHits([]);
        setSunkShipInfo(null);
        setPlayerShots({ hits: 0, total: 0 });
        setGameStartTime(null);
        setDraggedShip(null);
        setIsTouchDragging(false);
        setGhostPosition(null);
        clearPreview();
    }, [clearPreview]);

    useEffect(() => {
        setupNewGame();
    }, [setupNewGame]);

    const handleStartGame = () => {
        if (unplacedPlayerShips.length > 0) return;
        setPhase(GamePhase.BATTLE);
        setMessage("Your turn! Fire at the enemy's grid.");
        setGameStartTime(Date.now());
    };

    const handlePlayerAttack = (row: number, col: number) => {
        if (phase !== GamePhase.BATTLE || turn !== 'PLAYER' || winner) return;

        const cell = computerBoard[row][col];
        if (cell.status === CellStatus.HIT || cell.status === CellStatus.MISS || cell.status === CellStatus.SUNK) return;
        
        setPlayerShots(prev => ({ ...prev, total: prev.total + 1 }));

        const newBoard = computerBoard.map(r => r.map(c => ({ ...c })));
        let newComputerShips = computerShips.map(s => ({...s}));
        
        if (cell.shipId) {
            newBoard[row][col].status = CellStatus.HIT;
            setMessage('Direct hit!');
            setPlayerShots(prev => ({ ...prev, hits: prev.hits + 1 }));
            
            const hitShip = newComputerShips.find(s => s.id === cell.shipId);
            if (hitShip && isShipSunk(newBoard, hitShip)) {
                hitShip.sunk = true;
                setMessage(`You sunk their ${hitShip.name}!`);
                setSunkShipInfo({ player: 'COMPUTER', positions: hitShip.positions });
                setTimeout(() => setSunkShipInfo(null), 800);
                hitShip.positions.forEach(p => newBoard[p.row][p.col].status = CellStatus.SUNK);
            }
        } else {
            newBoard[row][col].status = CellStatus.MISS;
            setMessage('You missed.');
        }

        setComputerBoard(newBoard);
        setComputerShips(newComputerShips);

        if (newComputerShips.every(s => s.sunk)) {
            handleGameOver('PLAYER');
        } else {
            setTurn('COMPUTER');
        }
    };
    
    useEffect(() => {
        if (turn === 'COMPUTER' && phase === GamePhase.BATTLE && !winner) {
            setMessage("Computer is thinking...");
            setTimeout(() => {
                const { row, col } = getComputerMove(playerBoard, computerActiveHits);
                const newBoard = playerBoard.map(r => r.map(c => ({ ...c })));
                let newPlayerShips = playerShips.map(s => ({...s}));
                const cell = playerBoard[row][col];

                if (cell.shipId) {
                    newBoard[row][col].status = CellStatus.HIT;
                    setMessage(`Computer hit at (${String.fromCharCode(65 + col)}${row + 1})!`);
                    setComputerActiveHits(prev => [...prev, {row, col}]);
                    
                    const hitShip = newPlayerShips.find(s => s.id === cell.shipId);
                    if (hitShip && isShipSunk(newBoard, hitShip)) {
                        hitShip.sunk = true;
                        setMessage(`Computer sunk your ${hitShip.name}!`);
                        setSunkShipInfo({ player: 'PLAYER', positions: hitShip.positions });
                        setTimeout(() => setSunkShipInfo(null), 800);
                        
                        setComputerActiveHits(prevHits => 
                            prevHits.filter(hit => 
                                !hitShip.positions.some(p => p.row === hit.row && p.col === hit.col)
                            )
                        );
                        hitShip.positions.forEach(p => newBoard[p.row][p.col].status = CellStatus.SUNK);
                    }
                } else {
                    newBoard[row][col].status = CellStatus.MISS;
                    setMessage(`Computer missed at (${String.fromCharCode(65 + col)}${row + 1}).`);
                }

                setPlayerBoard(newBoard);
                setPlayerShips(newPlayerShips);
                
                if (newPlayerShips.every(s => s.sunk)) {
                    handleGameOver('COMPUTER');
                } else {
                    setTurn('PLAYER');
                    setMessage('Your turn!');
                }
            }, 1000);
        }
    }, [turn, phase, winner, playerBoard, playerShips, computerActiveHits, handleGameOver]);

    const handleUpdatePreview = (row: number, col: number) => {
        if (!draggedShip) return;

        const positions = [];
        const { orientation, length } = draggedShip;
        if (orientation === 'horizontal') {
            for (let i = 0; i < length; i++) positions.push({ row, col: col + i });
        } else {
            for (let i = 0; i < length; i++) positions.push({ row: row + i, col });
        }
        
        const isValid = canPlaceShip(playerBoard, draggedShip, row, col, orientation);
        setPreviewCells(positions);
        setIsPlacementValid(isValid);
    };

    // --- MOUSE DRAG HANDLERS ---
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, ship: UnplacedShip) => {
        e.dataTransfer.setData('shipId', ship.id);
        e.dataTransfer.setData('orientation', ship.orientation);
        setDraggedShip(ship);
    };

    const handlePlacedShipDragStart = (e: React.DragEvent<HTMLDivElement>, ship: PlacedShip) => {
        e.dataTransfer.setData('shipId', ship.id);
        e.dataTransfer.setData('orientation', ship.orientation);
        
        const unplacedShip: UnplacedShip = { id: ship.id, name: ship.name, length: ship.length, orientation: ship.orientation };
        setDraggedShip(unplacedShip);

        setTimeout(() => {
            const newBoard = playerBoard.map(r => r.map(c => ({...c})));
            ship.positions.forEach(({row, col}) => {
                newBoard[row][col] = { status: CellStatus.EMPTY, shipId: null };
            });
            setPlayerBoard(newBoard);
            setPlayerShips(playerShips.filter(s => s.id !== ship.id));
            setUnplacedPlayerShips(prev => [...prev, unplacedShip]);
        }, 0);
    };

    const handleDragEnd = () => {
        setDraggedShip(null);
        clearPreview();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, row: number, col: number) => {
        e.preventDefault();
        const shipId = e.dataTransfer.getData('shipId');
        const orientation = e.dataTransfer.getData('orientation') as Orientation;
        const shipToPlace = SHIPS.find(s => s.id === shipId);
        
        if (shipToPlace && canPlaceShip(playerBoard, shipToPlace, row, col, orientation)) {
            const { newBoard, positions } = placeShipOnBoard(playerBoard, shipToPlace, row, col, orientation);
            setPlayerBoard(newBoard);
            setPlayerShips(prev => [...prev, { ...shipToPlace, positions, sunk: false, orientation }]);
            setUnplacedPlayerShips(prev => prev.filter(s => s.id !== shipId));
        }
        setDraggedShip(null);
        clearPreview();
    };

    // --- TOUCH DRAG HANDLERS ---
    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>, ship: UnplacedShip) => {
        if (phase !== GamePhase.PLACEMENT) return;
        setDraggedShip(ship);
        setIsTouchDragging(true);
        setGhostPosition({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    };

    const handlePlacedShipTouchStart = (e: React.TouchEvent<HTMLDivElement>, ship: PlacedShip) => {
        if (phase !== GamePhase.PLACEMENT) return;
        const unplacedShip: UnplacedShip = { ...ship };
        setDraggedShip(unplacedShip);
        setIsTouchDragging(true);
        setGhostPosition({ x: e.touches[0].clientX, y: e.touches[0].clientY });
        
        // Remove from board immediately
        const newBoard = playerBoard.map(r => r.map(c => ({...c})));
        ship.positions.forEach(({row, col}) => {
            newBoard[row][col] = { status: CellStatus.EMPTY, shipId: null };
        });
        setPlayerBoard(newBoard);
        setPlayerShips(playerShips.filter(s => s.id !== ship.id));
        setUnplacedPlayerShips(prev => [...prev, unplacedShip]);
    };

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (!isTouchDragging || !draggedShip) return;
        e.preventDefault();

        const touch = e.touches[0];
        setGhostPosition({ x: touch.clientX, y: touch.clientY });

        if (ghostRef.current) ghostRef.current.style.display = 'none';
        const elementUnder = document.elementFromPoint(touch.clientX, touch.clientY);
        if (ghostRef.current) ghostRef.current.style.display = 'block';

        if (elementUnder?.getAttribute('data-row') && elementUnder?.getAttribute('data-col')) {
            const row = parseInt(elementUnder.getAttribute('data-row')!, 10);
            const col = parseInt(elementUnder.getAttribute('data-col')!, 10);
            handleUpdatePreview(row, col);
        } else {
            clearPreview();
        }
    }, [isTouchDragging, draggedShip, playerBoard, clearPreview]);

    const handleTouchEnd = useCallback((e: TouchEvent) => {
        if (!isTouchDragging || !draggedShip) return;

        if (ghostRef.current) ghostRef.current.style.display = 'none';
        const touch = e.changedTouches[0];
        const elementUnder = document.elementFromPoint(touch.clientX, touch.clientY);
        if (ghostRef.current) ghostRef.current.style.display = 'block';

        if (elementUnder?.getAttribute('data-row') && elementUnder?.getAttribute('data-col')) {
            const row = parseInt(elementUnder.getAttribute('data-row')!, 10);
            const col = parseInt(elementUnder.getAttribute('data-col')!, 10);

            if (canPlaceShip(playerBoard, draggedShip, row, col, draggedShip.orientation)) {
                const { newBoard, positions } = placeShipOnBoard(playerBoard, draggedShip, row, col, draggedShip.orientation);
                setPlayerBoard(newBoard);
                setPlayerShips(prev => [...prev, { ...draggedShip, positions, sunk: false, orientation: draggedShip.orientation }]);
                setUnplacedPlayerShips(prev => prev.filter(s => s.id !== draggedShip.id));
            }
        }
        
        setIsTouchDragging(false);
        setDraggedShip(null);
        setGhostPosition(null);
        clearPreview();
    }, [isTouchDragging, draggedShip, playerBoard, clearPreview]);

    useEffect(() => {
        if (isTouchDragging) {
            window.addEventListener('touchmove', handleTouchMove, { passive: false });
            window.addEventListener('touchend', handleTouchEnd);
        } else {
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        }
        return () => {
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isTouchDragging, handleTouchMove, handleTouchEnd]);


    const handleRotateShip = (shipId: string) => {
        setUnplacedPlayerShips(unplacedPlayerShips.map(ship => 
            ship.id === shipId 
                ? { ...ship, orientation: ship.orientation === 'horizontal' ? 'vertical' : 'horizontal' }
                : ship
        ));
    };

    const handleRotatePlacedShip = (shipId: string) => {
        if (phase !== GamePhase.PLACEMENT) return;

        const shipToRotate = playerShips.find(s => s.id === shipId);
        if (!shipToRotate) return;

        const newOrientation = shipToRotate.orientation === 'horizontal' ? 'vertical' : 'horizontal';
        const anchorPosition = shipToRotate.positions[0];

        let tempBoard = playerBoard.map(r => r.map(c => ({...c})));
        shipToRotate.positions.forEach(({ row, col }) => {
            tempBoard[row][col] = { status: CellStatus.EMPTY, shipId: null };
        });

        if (canPlaceShip(tempBoard, shipToRotate, anchorPosition.row, anchorPosition.col, newOrientation)) {
            const { newBoard, positions } = placeShipOnBoard(tempBoard, shipToRotate, anchorPosition.row, anchorPosition.col, newOrientation);
            
            setPlayerBoard(newBoard);
            setPlayerShips(playerShips.map(ship => 
                ship.id === shipId 
                    ? { ...ship, orientation: newOrientation, positions } 
                    : ship
            ));
        }
    };

    const handleResetStats = () => {
      const defaultStats = resetStats();
      setStats(defaultStats);
    };
    
    return (
        <div className="min-h-screen bg-gradient-to-b from-navy-900 to-navy-800 flex flex-col items-center p-4 md:p-8">
            {isTouchDragging && draggedShip && ghostPosition && (
                <DraggableShipGhost ref={ghostRef} ship={draggedShip} position={ghostPosition} />
            )}

            {isStatsVisible && (
              <GameStats stats={stats} onClose={() => setIsStatsVisible(false)} onReset={handleResetStats} />
            )}

            <header className="relative w-full text-center mb-6">
                <h1 className="text-4xl md:text-5xl font-bold text-cyan-light tracking-widest">BATTLESHIP</h1>
                <p className="text-slate-DEFAULT">Naval Warfare Edition</p>
                <button
                  onClick={() => setIsStatsVisible(true)}
                  className="absolute top-0 right-0 p-2 text-slate-DEFAULT hover:text-cyan-light transition-colors"
                  aria-label="Show game statistics"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                </button>
            </header>

            <GameStatus 
                phase={phase}
                message={message}
                winner={winner}
                onReset={setupNewGame}
                onStartGame={handleStartGame}
                canStart={unplacedPlayerShips.length === 0}
            />
            
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 w-full max-w-7xl justify-center items-start">
                <Board 
                    title="Your Fleet" 
                    board={playerBoard}
                    placedShips={playerShips}
                    isPlayerBoard={true} 
                    disabled={phase !== GamePhase.PLACEMENT}
                    isTurn={turn === 'COMPUTER' && phase === GamePhase.BATTLE}
                    onCellDragOver={(e, row, col) => { e.preventDefault(); handleUpdatePreview(row, col); }}
                    onDragLeave={clearPreview}
                    onCellDrop={(e, row, col) => handleDrop(e, row, col)}
                    onPlacedShipDragStart={handlePlacedShipDragStart}
                    onPlacedShipDragEnd={handleDragEnd}
                    onPlacedShipTouchStart={handlePlacedShipTouchStart}
                    onRotatePlacedShip={handleRotatePlacedShip}
                    draggedShip={draggedShip}
                    sunkShipPositions={sunkShipInfo?.player === 'PLAYER' ? sunkShipInfo.positions : undefined}
                    previewCells={previewCells}
                    isPlacementValid={isPlacementValid}
                />
                <Board 
                    title="Enemy Waters" 
                    board={computerBoard}
                    placedShips={computerShips}
                    isPlayerBoard={false} 
                    onCellClick={handlePlayerAttack} 
                    disabled={turn !== 'PLAYER' || phase !== GamePhase.BATTLE}
                    isTurn={turn === 'PLAYER' && phase === GamePhase.BATTLE}
                    sunkShipPositions={sunkShipInfo?.player === 'COMPUTER' ? sunkShipInfo.positions : undefined}
                />
            </div>

            {phase === GamePhase.PLACEMENT && (
                <div className="mt-8 p-4 bg-navy-800/70 rounded-lg shadow-xl w-full max-w-4xl animate-fadeIn">
                    <h3 className="text-xl font-bold text-slate-light text-center mb-2">Place Your Ships</h3>
                    <div className="flex flex-wrap items-center justify-center p-2 border-2 border-dashed border-navy-700 rounded-md min-h-[120px]">
                        {unplacedPlayerShips.map(ship => (
                            <ShipPlacement 
                                key={ship.id}
                                ship={ship}
                                onDragStart={handleDragStart}
                                onTouchStart={handleTouchStart}
                                onRotate={handleRotateShip}
                                onDragEnd={handleDragEnd}
                            />
                        ))}
                        {unplacedPlayerShips.length === 0 && <p className="text-slate-DEFAULT p-4">All ships have been placed. Ready for battle!</p>}
                    </div>
                </div>
            )}

            {phase === GamePhase.BATTLE || phase === GamePhase.GAME_OVER ? (
              <FleetStatus playerShips={playerShips} computerShips={computerShips} />
            ) : null}

            <footer className="mt-auto pt-8 text-center text-slate-DEFAULT text-sm">
                <p>&copy; {new Date().getFullYear()} Abu Foysal. All Rights Reserved.</p>
                <p>A modern take on a classic naval strategy game.</p>
            </footer>
        </div>
    );
};

export default App;
