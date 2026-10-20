import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SHIPS, BOARD_SIZE, columnLabel } from './constants';
import { BoardState, CellStatus, GamePhase, PlacedShip, Player, UnplacedShip, GameStatsData } from './types';
import { createEmptyBoard, placeAllComputerShips, canPlaceShip, placeShipOnBoard, getComputerMove, isShipSunk, getBoardWithoutShip } from './services/gameLogic';
import { loadStats, saveStats, resetStats } from './services/statsService';
import Board from './components/Board';
import GameStatus from './components/GameStatus';
import ShipPlacement from './components/ShipPlacement';
import FleetStatus from './components/FleetStatus';
import GameStats from './components/GameStats';
import DraggableShipGhost from './components/DraggableShipGhost';

// 1x1 transparent gif. Passed to setDragImage so the browser does not render
// its own drag image; we render custom ghosts that stay aligned with the board.
const EMPTY_DRAG_IMAGE = (() => {
    const img = document.createElement('img');
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    return img;
})();

const suppressNativeDragImage = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer.setDragImage) {
        e.dataTransfer.setDragImage(EMPTY_DRAG_IMAGE, 0, 0);
    }
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Which cell of the ship (0-based, along its orientation) was grabbed at the given pointer position. */
const computeGrabOffset = (clientX: number, clientY: number, el: HTMLElement, ship: UnplacedShip): { r: number; c: number } => {
    const rect = el.getBoundingClientRect();
    const cellWidth = rect.width / ship.length;
    const cellHeight = rect.height / ship.length;
    const c = ship.orientation === 'horizontal' ? clamp(Math.floor((clientX - rect.left) / cellWidth), 0, ship.length - 1) : 0;
    const r = ship.orientation === 'vertical' ? clamp(Math.floor((clientY - rect.top) / cellHeight), 0, ship.length - 1) : 0;
    return { r, c };
};

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
    const [dragPointer, setDragPointer] = useState<{ x: number, y: number } | null>(null);
    const [dragGrabOffset, setDragGrabOffset] = useState({ r: 0, c: 0 });
    const [cellMetrics, setCellMetrics] = useState({ cell: 40, pitch: 42 });
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
        // Returning the previous array keeps a no-op clear out of the render path.
        setPreviewCells(prev => (prev.length === 0 ? prev : []));
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
        setDragPointer(null);
        setDragGrabOffset({ r: 0, c: 0 });
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
        
        const isHit = !!cell.shipId;

        if (isHit) {
            newBoard[row][col].status = CellStatus.HIT;
            setPlayerShots(prev => ({ ...prev, hits: prev.hits + 1 }));
            
            const hitShip = newComputerShips.find(s => s.id === cell.shipId);
            if (hitShip && isShipSunk(newBoard, hitShip)) {
                hitShip.sunk = true;
                setMessage(`You sunk their ${hitShip.name}! Shoot again.`);
                setSunkShipInfo({ player: 'COMPUTER', positions: hitShip.positions });
                setTimeout(() => setSunkShipInfo(null), 800);
                hitShip.positions.forEach(p => newBoard[p.row][p.col].status = CellStatus.SUNK);
            } else {
                setMessage('Direct hit! Shoot again.');
            }
        } else {
            newBoard[row][col].status = CellStatus.MISS;
            setMessage('You missed. Computer is thinking...');
        }

        setComputerBoard(newBoard);
        setComputerShips(newComputerShips);

        if (newComputerShips.every(s => s.sunk)) {
            handleGameOver('PLAYER');
        } else if (!isHit) {
            // A hit keeps the turn with the player; only a miss passes it on.
            setTurn('COMPUTER');
        }
    };
    
    useEffect(() => {
        if (turn === 'COMPUTER' && phase === GamePhase.BATTLE && !winner) {
            const timer = setTimeout(() => {
                const { row, col } = getComputerMove(playerBoard, computerActiveHits);
                const newBoard = playerBoard.map(r => r.map(c => ({ ...c })));
                let newPlayerShips = playerShips.map(s => ({...s}));
                const cell = playerBoard[row][col];
                const isHit = !!cell.shipId;
                const coordinates = `(${columnLabel(col)}${row + 1})`;

                if (isHit) {
                    newBoard[row][col].status = CellStatus.HIT;
                    setComputerActiveHits(prev => [...prev, {row, col}]);
                    
                    const hitShip = newPlayerShips.find(s => s.id === cell.shipId);
                    if (hitShip && isShipSunk(newBoard, hitShip)) {
                        hitShip.sunk = true;
                        setMessage(`Computer sunk your ${hitShip.name}! Firing again.`);
                        setSunkShipInfo({ player: 'PLAYER', positions: hitShip.positions });
                        setTimeout(() => setSunkShipInfo(null), 800);
                        
                        setComputerActiveHits(prevHits => 
                            prevHits.filter(hit => 
                                !hitShip.positions.some(p => p.row === hit.row && p.col === hit.col)
                            )
                        );
                        hitShip.positions.forEach(p => newBoard[p.row][p.col].status = CellStatus.SUNK);
                    } else {
                        setMessage(`Computer hit at ${coordinates}! Firing again.`);
                    }
                } else {
                    newBoard[row][col].status = CellStatus.MISS;
                    setMessage(`Computer missed at ${coordinates}. Your turn!`);
                }

                setPlayerBoard(newBoard);
                setPlayerShips(newPlayerShips);
                
                if (newPlayerShips.every(s => s.sunk)) {
                    handleGameOver('COMPUTER');
                } else if (!isHit) {
                    // A hit keeps the turn with the computer; only a miss passes it on.
                    setTurn('PLAYER');
                }
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, [turn, phase, winner, playerBoard, playerShips, computerActiveHits, handleGameOver]);

    const endDrag = useCallback(() => {
        setDraggedShip(null);
        setIsTouchDragging(false);
        setGhostPosition(null);
        setDragPointer(null);
        setDragGrabOffset({ r: 0, c: 0 });
        clearPreview();
    }, [clearPreview]);

    /**
     * The cell under the pointer maps to the cell of the ship that was grabbed
     * (dragGrabOffset), so the ghost/preview/drop always agree with each other.
     */
    const handleUpdatePreview = useCallback((row: number, col: number) => {
        if (!draggedShip) return;

        const anchorRow = row - dragGrabOffset.r;
        const anchorCol = col - dragGrabOffset.c;
        const { orientation, length } = draggedShip;

        const positions: { row: number; col: number }[] = [];
        for (let i = 0; i < length; i++) {
            positions.push(orientation === 'horizontal' ? { row: anchorRow, col: anchorCol + i } : { row: anchorRow + i, col: anchorCol });
        }

        // dragover keeps firing while the anchor cell has not changed; reusing the
        // previous state keeps those redundant events out of the render path.
        setPreviewCells(prev =>
            prev.length === positions.length && prev.every((p, i) => p.row === positions[i].row && p.col === positions[i].col)
                ? prev
                : positions
        );

        // Validity is checked against the board with the dragged ship itself removed,
        // so a placed ship can be dropped back onto its own cells.
        const baseBoard = getBoardWithoutShip(playerBoard, draggedShip.id);
        const valid = canPlaceShip(baseBoard, draggedShip, anchorRow, anchorCol, orientation);
        setIsPlacementValid(prev => (prev === valid ? prev : valid));
    }, [draggedShip, dragGrabOffset, playerBoard]);

    /** Places the dragged ship at the given pointer cell (if valid) and ends the drag. */
    const tryPlaceShip = useCallback((row: number, col: number) => {
        if (draggedShip) {
            const anchorRow = row - dragGrabOffset.r;
            const anchorCol = col - dragGrabOffset.c;
            const { orientation } = draggedShip;
            const baseBoard = getBoardWithoutShip(playerBoard, draggedShip.id);

            if (canPlaceShip(baseBoard, draggedShip, anchorRow, anchorCol, orientation)) {
                const { newBoard, positions } = placeShipOnBoard(baseBoard, draggedShip, anchorRow, anchorCol, orientation);
                setPlayerBoard(newBoard);

                if (playerShips.some(s => s.id === draggedShip.id)) {
                    // Moving a ship that is already on the board.
                    setPlayerShips(prev => prev.map(s =>
                        s.id === draggedShip.id ? { ...s, positions, orientation, sunk: false } : s
                    ));
                } else {
                    // Placing a ship from the tray.
                    setPlayerShips(prev => [...prev, { ...draggedShip, positions, sunk: false, orientation }]);
                    setUnplacedPlayerShips(prev => prev.filter(s => s.id !== draggedShip.id));
                }
            }
        }
        endDrag();
    }, [draggedShip, dragGrabOffset, playerBoard, playerShips, endDrag]);

    // --- MOUSE DRAG HANDLERS ---
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, ship: UnplacedShip) => {
        e.dataTransfer.setData('shipId', ship.id);
        e.dataTransfer.setData('orientation', ship.orientation);
        suppressNativeDragImage(e);
        setDraggedShip(ship);
        setDragGrabOffset(computeGrabOffset(e.clientX, e.clientY, e.currentTarget, ship));
        setDragPointer({ x: e.clientX, y: e.clientY });
    };

    const handlePlacedShipDragStart = (e: React.DragEvent<HTMLDivElement>, ship: PlacedShip) => {
        e.dataTransfer.setData('shipId', ship.id);
        e.dataTransfer.setData('orientation', ship.orientation);
        suppressNativeDragImage(e);

        const unplacedShip: UnplacedShip = { id: ship.id, name: ship.name, length: ship.length, orientation: ship.orientation };
        setDraggedShip(unplacedShip);
        setDragGrabOffset(computeGrabOffset(e.clientX, e.clientY, e.currentTarget, unplacedShip));
        setDragPointer({ x: e.clientX, y: e.clientY });
        // The ship stays on the board until the drop succeeds; a cancelled drag
        // simply leaves it where it was.
    };

    const handleDragEnd = () => endDrag();

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, row: number, col: number) => {
        e.preventDefault();
        tryPlaceShip(row, col);
    };

    // --- TOUCH DRAG HANDLERS ---
    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>, ship: UnplacedShip) => {
        if (phase !== GamePhase.PLACEMENT) return;
        const touch = e.touches[0];
        setDraggedShip(ship);
        setIsTouchDragging(true);
        setGhostPosition({ x: touch.clientX, y: touch.clientY });
        setDragGrabOffset(computeGrabOffset(touch.clientX, touch.clientY, e.currentTarget, ship));
    };

    const handlePlacedShipTouchStart = (e: React.TouchEvent<HTMLDivElement>, ship: PlacedShip) => {
        if (phase !== GamePhase.PLACEMENT) return;
        const touch = e.touches[0];
        const unplacedShip: UnplacedShip = { id: ship.id, name: ship.name, length: ship.length, orientation: ship.orientation };
        setDraggedShip(unplacedShip);
        setIsTouchDragging(true);
        setGhostPosition({ x: touch.clientX, y: touch.clientY });
        setDragGrabOffset(computeGrabOffset(touch.clientX, touch.clientY, e.currentTarget, unplacedShip));
    };

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (!isTouchDragging || !draggedShip) return;
        e.preventDefault();

        const touch = e.touches[0];
        setGhostPosition({ x: touch.clientX, y: touch.clientY });

        if (ghostRef.current) ghostRef.current.style.display = 'none';
        const elementUnder = document.elementFromPoint(touch.clientX, touch.clientY);
        if (ghostRef.current) ghostRef.current.style.display = 'block';

        // Only cells of the player's own board are valid placement targets.
        const rowAttr = elementUnder?.getAttribute('data-row');
        const colAttr = elementUnder?.getAttribute('data-col');
        if (elementUnder?.getAttribute('data-board') === 'player' && rowAttr != null && colAttr != null) {
            handleUpdatePreview(parseInt(rowAttr, 10), parseInt(colAttr, 10));
        } else {
            clearPreview();
        }
    }, [isTouchDragging, draggedShip, handleUpdatePreview, clearPreview]);

    const handleTouchEnd = useCallback((e: TouchEvent) => {
        if (!isTouchDragging || !draggedShip) return;

        if (ghostRef.current) ghostRef.current.style.display = 'none';
        const touch = e.changedTouches[0];
        const elementUnder = document.elementFromPoint(touch.clientX, touch.clientY);
        if (ghostRef.current) ghostRef.current.style.display = 'block';

        // Only cells of the player's own board are valid placement targets.
        const rowAttr = elementUnder?.getAttribute('data-row');
        const colAttr = elementUnder?.getAttribute('data-col');
        if (elementUnder?.getAttribute('data-board') === 'player' && rowAttr != null && colAttr != null) {
            tryPlaceShip(parseInt(rowAttr, 10), parseInt(colAttr, 10));
        } else {
            endDrag();
        }
    }, [isTouchDragging, draggedShip, tryPlaceShip, endDrag]);

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

    // Track the pointer while a mouse drag is active so the free-follow ghost can
    // be shown whenever the cursor is not over the player's board. Leaving the
    // board is decided here, from the pointer position (dragover fires window-wide,
    // unlike dragleave, which is unreliable to detect board exits with).
    // A window-level dragend acts as a safety net: cancelled drags and drops
    // outside the board always clear the drag state.
    useEffect(() => {
        if (!draggedShip || isTouchDragging) return;
        let frame: number | null = null;
        let pending: { x: number; y: number } | null = null;

        const onDragOver = (e: DragEvent) => {
            const elementUnder = document.elementFromPoint(e.clientX, e.clientY);
            const overPlayerBoard = !!elementUnder?.closest('[data-board-container="player"]');
            if (overPlayerBoard) {
                // Board.tsx already refreshed the preview under the cursor; the
                // finger-following ghost is hidden while it is showing.
                return;
            }

            clearPreview();

            // Pointer updates are throttled to one per frame; off the board the
            // free-follow ghost is the only thing that moves.
            pending = { x: e.clientX, y: e.clientY };
            if (frame !== null) return;
            frame = requestAnimationFrame(() => {
                frame = null;
                const next = pending;
                if (next) {
                    setDragPointer(prev => (prev && Math.abs(prev.x - next.x) < 2 && Math.abs(prev.y - next.y) < 2) ? prev : next);
                }
            });
        };
        const onDragEnd = () => endDrag();
        window.addEventListener('dragover', onDragOver);
        window.addEventListener('dragend', onDragEnd);
        return () => {
            if (frame !== null) cancelAnimationFrame(frame);
            window.removeEventListener('dragover', onDragOver);
            window.removeEventListener('dragend', onDragEnd);
        };
    }, [draggedShip, isTouchDragging, endDrag, clearPreview]);


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
        const anchor = shipToRotate.positions[0];
        const baseBoard = getBoardWithoutShip(playerBoard, shipId);

        // Try rotating in place first; if the rotated ship does not fit there,
        // expand ring by ring around the anchor and take the nearest spot that
        // does, so the rotation adjusts the ship's position automatically.
        const candidates: { row: number; col: number }[] = [{ row: anchor.row, col: anchor.col }];
        for (let distance = 1; distance < BOARD_SIZE; distance++) {
            for (let dr = -distance; dr <= distance; dr++) {
                for (let dc = -distance; dc <= distance; dc++) {
                    if (Math.max(Math.abs(dr), Math.abs(dc)) !== distance) continue;
                    candidates.push({ row: anchor.row + dr, col: anchor.col + dc });
                }
            }
        }

        const target = candidates.find(c => canPlaceShip(baseBoard, shipToRotate, c.row, c.col, newOrientation));
        if (!target) return;

        const { newBoard, positions } = placeShipOnBoard(baseBoard, shipToRotate, target.row, target.col, newOrientation);
        setPlayerBoard(newBoard);
        setPlayerShips(prev => prev.map(ship =>
            ship.id === shipId
                ? { ...ship, orientation: newOrientation, positions }
                : ship
        ));
    };

    const handleResetStats = () => {
      const defaultStats = resetStats();
      setStats(defaultStats);
    };
    
    return (
        <div className="min-h-screen bg-gradient-to-b from-navy-900 to-navy-800 flex flex-col items-center p-2 sm:p-4 md:p-8">
            {isTouchDragging && draggedShip && ghostPosition && (
                <DraggableShipGhost
                    ref={ghostRef}
                    ship={draggedShip}
                    position={ghostPosition}
                    grabOffset={dragGrabOffset}
                    cellSize={cellMetrics.cell}
                    cellPitch={cellMetrics.pitch}
                />
            )}

            {/* Mouse drag: free-follow ghost while the cursor is not over a board cell.
                Over the board, Board.tsx renders a snapped ghost that matches the preview cells. */}
            {!isTouchDragging && draggedShip && dragPointer && previewCells.length === 0 && (
                <DraggableShipGhost
                    ship={draggedShip}
                    position={dragPointer}
                    grabOffset={dragGrabOffset}
                    cellSize={cellMetrics.cell}
                    cellPitch={cellMetrics.pitch}
                />
            )}

            {isStatsVisible && (
              <GameStats stats={stats} onClose={() => setIsStatsVisible(false)} onReset={handleResetStats} />
            )}

            <header className="relative w-full text-center mb-6">
                <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-cyan-light tracking-widest">BATTLESHIP</h1>
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
            
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 w-full max-w-7xl justify-center items-center lg:items-start">
                <Board 
                    title="Your Fleet" 
                    board={playerBoard}
                    placedShips={playerShips}
                    isPlayerBoard={true} 
                    disabled={phase !== GamePhase.PLACEMENT}
                    isTurn={turn === 'COMPUTER' && phase === GamePhase.BATTLE}
                    onCellDragOver={(e, row, col) => { e.preventDefault(); handleUpdatePreview(row, col); }}
                    onCellDrop={(e, row, col) => handleDrop(e, row, col)}
                    onPlacedShipDragStart={handlePlacedShipDragStart}
                    onPlacedShipDragEnd={handleDragEnd}
                    onPlacedShipTouchStart={handlePlacedShipTouchStart}
                    onRotatePlacedShip={handleRotatePlacedShip}
                    draggedShip={draggedShip}
                    sunkShipPositions={sunkShipInfo?.player === 'PLAYER' ? sunkShipInfo.positions : undefined}
                    previewCells={previewCells}
                    isPlacementValid={isPlacementValid}
                    onCellMeasure={setCellMetrics}
                    isTouchDrag={isTouchDragging}
                />
                {/* On phones and tablets the boards stack, so during placement the enemy
                    grid would only push the ship tray below the fold. Hide it there until
                    the battle starts; desktop keeps both boards visible. */}
                <div className={`w-full max-w-[462px] ${phase === GamePhase.PLACEMENT ? 'hidden lg:block' : ''}`}>
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
            </div>

            {phase === GamePhase.PLACEMENT && (
                <div className="mt-8 p-4 bg-navy-800/70 rounded-lg shadow-xl w-full max-w-4xl animate-fadeIn">
                    <h3 className="text-xl font-bold text-slate-light text-center mb-2">Place Your Ships</h3>
                    <div className="flex flex-wrap items-center justify-center p-2 border-2 border-dashed border-navy-700 rounded-md min-h-[120px]">
                        {unplacedPlayerShips.map(ship => (
                            <ShipPlacement 
                                key={ship.id}
                                ship={ship}
                                cellSize={cellMetrics.cell}
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
