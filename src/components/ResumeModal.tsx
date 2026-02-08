import React from 'react';

interface ResumeModalProps {
  onResume: () => void;
  onStartNew: () => void;
  gameInfo?: {
    playerCount: number;
    isLocked: boolean;
    venue?: string;
  };
}

const ResumeModal: React.FC<ResumeModalProps> = ({ onResume, onStartNew, gameInfo }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🐠</div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Resume last game?</h2>
          {gameInfo && (
            <div className="text-sm text-gray-600">
              <p>{gameInfo.playerCount} player{gameInfo.playerCount !== 1 ? 's' : ''}</p>
              {gameInfo.venue && <p className="text-xs mt-1">{gameInfo.venue}</p>}
              <p className="text-xs mt-1 font-semibold text-blue-600">
                {gameInfo.isLocked ? '🔒 Locked' : '⏳ In Setup'}
              </p>
            </div>
          )}
        </div>
        
        <div className="space-y-3">
          <button
            onClick={onResume}
            className="w-full bg-blue-500 text-white font-bold py-3 px-4 rounded-xl hover:bg-blue-600 transition"
          >
            Resume Game
          </button>
          <button
            onClick={onStartNew}
            className="w-full bg-gray-200 text-gray-800 font-bold py-3 px-4 rounded-xl hover:bg-gray-300 transition"
          >
            Start New Game
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResumeModal;