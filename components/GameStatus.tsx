
import React from 'react';
import { GamePhase } from '../types';

interface GameStatusProps {
  phase: GamePhase;
  message: string;
  winner: 'PLAYER' | 'COMPUTER' | null;
  onReset: () => void;
  onStartGame: () => void;
  canStart: boolean;
}

const GameStatus: React.FC<GameStatusProps> = ({ phase, message, winner, onReset, onStartGame, canStart }) => {
  return (
    <div className="text-center p-4 my-4 rounded-lg bg-navy-800/70 shadow-xl min-h-[100px] flex flex-col justify-center items-center animate-fadeIn">
      <p className="text-lg md:text-xl font-semibold text-slate-light mb-4">{message}</p>
      {phase === GamePhase.GAME_OVER && (
        <button
          onClick={onReset}
          className="px-6 py-2 bg-cyan-light text-navy-900 font-bold rounded-md shadow-lg hover:bg-white transition-all duration-300 transform hover:scale-105"
        >
          Play Again
        </button>
      )}
      {phase === GamePhase.PLACEMENT && (
        <button
          onClick={onStartGame}
          disabled={!canStart}
          className="px-6 py-2 bg-cyan-light text-navy-900 font-bold rounded-md shadow-lg hover:bg-white transition-all duration-300 transform hover:scale-105 disabled:bg-slate-DEFAULT disabled:cursor-not-allowed disabled:scale-100"
        >
          Start Game
        </button>
      )}
    </div>
  );
};

export default GameStatus;
