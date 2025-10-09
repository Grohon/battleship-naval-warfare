import React from 'react';
import { GameStatsData } from '../types';

interface GameStatsProps {
  stats: GameStatsData;
  onClose: () => void;
  onReset: () => void;
}

const formatTime = (milliseconds: number | null): string => {
  if (milliseconds === null) return 'N/A';
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const StatItem: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="flex justify-between items-baseline p-3 bg-navy-700 rounded-md">
    <span className="text-slate-DEFAULT">{label}</span>
    <span className="text-2xl font-bold text-cyan-light">{value}</span>
  </div>
);

const GameStats: React.FC<GameStatsProps> = ({ stats, onClose, onReset }) => {
  const accuracy = stats.totalShots > 0 ? ((stats.totalHits / stats.totalShots) * 100).toFixed(1) + '%' : '0.0%';

  return (
    <div 
      className="fixed inset-0 bg-navy-900/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-navy-800 rounded-lg shadow-2xl p-6 md:p-8 w-11/12 max-w-md border border-cyan-light/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-light tracking-wider">Game Statistics</h2>
          <button onClick={onClose} className="text-slate-DEFAULT hover:text-cyan-light transition-colors text-2xl">&times;</button>
        </div>
        
        <div className="space-y-3">
          <StatItem label="Games Played" value={stats.gamesPlayed} />
          <StatItem label="Wins" value={stats.wins} />
          <StatItem label="Losses" value={stats.losses} />
          <StatItem label="Accuracy" value={accuracy} />
          <StatItem label="Fastest Win" value={formatTime(stats.fastestWinTime)} />
        </div>
        
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to reset all statistics? This action cannot be undone.')) {
                onReset();
              }
            }}
            className="w-full px-4 py-2 bg-red-800/80 text-white font-bold rounded-md shadow-lg hover:bg-red-700 transition-all duration-300"
          >
            Reset Stats
          </button>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-cyan-light text-navy-900 font-bold rounded-md shadow-lg hover:bg-white transition-all duration-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameStats;
