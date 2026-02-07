import React, { useState, useEffect, useMemo } from 'react';
import { Game, Player, SongPicks, Setlist } from './types';
import Layout from './components/Layout';
import { ListSection, ListItem, PrimaryButton, IOSInput } from './components/IOSComponents';
import AutocompleteInput from './components/AutocompleteInput';
import * as scoring from './services/scoring';
import { fetchLiveSetlist, fetchTourInsights, fetchShowDetails, fetchAllSongs, fetchRecentTourStats, SongInsight } from './services/setlistService';

// --- Utility for Sharing State via URL ---
const encodeGameState = (game: Game): string => {
  const json = JSON.stringify(game);
  return btoa(encodeURIComponent(json));
};

const decodeGameState = (encoded: string): Game | null => {
  try {
    const json = decodeURIComponent(atob(encoded));
    return JSON.parse(json);
  } catch (e) {
    console.error("Failed to decode game state", e);
    return null;
  }
};

// --- Helper: Calculate completion (x/10 fields filled) ---
const calculateCompletion = (picks: SongPicks): number => {
  let count = 0;
  
  // 5 main picks
  if (picks.opener) count++;
  if (picks.set1Closer) count++;
  if (picks.set2Opener) count++;
  if (picks.set2Closer) count++;
  if (picks.encore) count++;
  
  // 2 wildcards
  if (picks.wildcards[0]) count++;
  if (picks.wildcards[1]) count++;
  
  // 3 Rock n Jock fields
  if (picks.rockNJock.song) count++;
  if (picks.rockNJock.set) count++;
  if (picks.rockNJock.position > 0) count++;
  
  return count;
};

// --- View Models ---
const useGameViewModel = () => {
  const [insights, setInsights] = useState<SongInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [game, setGame] = useState<Game | null>(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#game=')) {
      const encoded = hash.replace('#game=', '');
      const decoded = decodeGameState(encoded);
      if (decoded) {
        window.history.replaceState(null, "", window.location.pathname);
        return decoded;
      }
    }
    const saved = localStorage.getItem('phish_game_state');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (game) {
      localStorage.setItem('phish_game_state', JSON.stringify(game));
      if (insights.length === 0) {
        const cached = localStorage.getItem(`phish_all_songs`);
        if (cached) {
          setInsights(JSON.parse(cached));
        }
      }
    } else {
      localStorage.removeItem('phish_game_state');
    }
  }, [game]);

  const refreshInsights = async (date: string) => {
    setLoadingInsights(true);
    try {
      const newInsights = await fetchTourInsights(date);
      if (newInsights.length > 0) {
        setInsights(newInsights);
        localStorage.setItem(`phish_insights_${date}`, JSON.stringify(newInsights));
      }
    } catch (e) {
      console.error("Error in refreshInsights", e);
    } finally {
      setLoadingInsights(false);
    }
  };

  const createGame = (showDate: string, venue?: string) => {
    const newGame: Game = {
      id: crypto.randomUUID(),
      code: Math.random().toString(36).substring(2, 8).toUpperCase(),
      lockTime: showDate,
      players: [],
      setlist: { set1: [], set2: [], encore: [] },
      status: 'lobby',
      venue,
      isLocked: false, // NEW: Start unlocked
    };
    setGame(newGame);
    
    const loadSongs = async () => {
      const allSongs = await fetchAllSongs();
      if (allSongs.length > 0) {
        setInsights(allSongs);
        localStorage.setItem(`phish_all_songs`, JSON.stringify(allSongs));
        console.log('✅ Phase 1 complete: Autocomplete ready with all-time stats');
      }
      
      const recentStats = await fetchRecentTourStats();
      if (recentStats.length > 0) {
        setInsights(recentStats);
        console.log('✅ Phase 2 complete: Updated with recent 3-month tour stats');
      }
    };
    loadSongs();
    
    return newGame;
  };

  const addPlayer = (name: string) => {
    if (!game) return;
    if (game.isLocked) {
      alert('Game is locked! Cannot add players.');
      return;
    }
    
    const newPlayer: Player = {
      id: crypto.randomUUID(),
      name,
      picks: { 
        opener: '', 
        set1Closer: '', 
        set2Opener: '', 
        set2Closer: '', 
        encore: '', 
        wildcards: ['', ''],
        rockNJock: { song: '', set: '', position: 0 }
      },
      score: 0,
      breakdown: { 
        opener: false, 
        set1Closer: false, 
        set2Opener: false, 
        set2Closer: false, 
        encore: false, 
        wildcards: [false, false],
        rockNJock: false
      }
    };
    setGame({ ...game, players: [...game.players, newPlayer] });
  };

  const removePlayer = (playerId: string) => {
    if (!game) return;
    if (game.isLocked) {
      alert('Game is locked! Cannot remove players.');
      return;
    }
    
    if (window.confirm('Remove this player?')) {
      setGame({ 
        ...game, 
        players: game.players.filter(p => p.id !== playerId) 
      });
    }
  };

  const updatePicks = (playerId: string, picks: SongPicks) => {
    if (!game) return;
    if (game.isLocked) {
      alert('Game is locked! Cannot edit picks.');
      return;
    }
    
    setGame({
      ...game,
      players: game.players.map(p => p.id === playerId ? { ...p, picks } : p)
    });
  };

  const lockGame = () => {
    if (!game) return;
    
    // Check all players are 10/10
    const allComplete = game.players.every(p => calculateCompletion(p.picks) === 10);
    if (!allComplete) {
      alert('All players must complete all 10 picks before locking!');
      return;
    }
    
    setGame({
      ...game,
      isLocked: true,
      lockedAt: new Date().toISOString(),
      lockedPlayerIds: game.players.map(p => p.id)
    });
  };

  const updateSetlist = (setlist: Setlist) => {
    if (!game) return;
    setGame({ ...game, setlist });
  };

  const finalizeScores = (customSetlist?: Setlist) => {
    if (!game) return;
    const currentSetlist = customSetlist || game.setlist;
    const updatedPlayers = game.players.map(p => {
      const { score, breakdown } = scoring.calculatePlayerScore(p.picks, currentSetlist);
      return { ...p, score, breakdown };
    });
    setGame({ ...game, players: updatedPlayers, setlist: currentSetlist, status: 'completed' });
  };

  const resetGame = () => {
    if (window.confirm("Are you sure? This deletes all current picks and players.")) {
      setGame(null);
      setInsights([]);
      localStorage.removeItem('phish_game_state');
      return true;
    }
    return false;
  };

  const isLocked = useMemo(() => {
    if (!game) return false;
    return game.isLocked;
  }, [game?.isLocked]);

  const generateShareLink = () => {
    if (!game) return "";
    const encoded = encodeGameState(game);
    return `${window.location.origin}${window.location.pathname}#game=${encoded}`;
  };

  return { 
    game, 
    insights,
    loadingInsights,
    createGame, 
    addPlayer,
    removePlayer,
    updatePicks, 
    lockGame,
    updateSetlist, 
    finalizeScores, 
    isLocked, 
    generateShareLink,
    resetGame,
    refreshInsights
  };
};

// --- Views ---

enum View {
  HOME,
  CREATE_GAME,
  LOBBY,
  PICKS,
  RESULTS
}

const App: React.FC = () => {
  const vm = useGameViewModel();
  const [currentView, setCurrentView] = useState<View>(View.HOME);
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  
  const [showDate, setShowDate] = useState(new Date().toISOString().split('T')[0]);
  const [venueInfo, setVenueInfo] = useState<string>('');
  const [isFetchingVenue, setIsFetchingVenue] = useState(false);

  useEffect(() => {
    if (vm.game && currentView === View.HOME) {
      setCurrentView(View.LOBBY);
    }
  }, [vm.game, currentView]);

  useEffect(() => {
    if (currentView === View.CREATE_GAME && showDate) {
      const getVenue = async () => {
        setIsFetchingVenue(true);
        const details = await fetchShowDetails(showDate);
        setVenueInfo(details || 'No show found for this date');
        setIsFetchingVenue(false);
      };
      getVenue();
    }
  }, [showDate, currentView]);

  const handleCopyLink = () => {
    const link = vm.generateShareLink();
    navigator.clipboard.writeText(link).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    });
  };

  const handleCalculateResults = async () => {
    if (!vm.game) return;
    
    setIsCalculating(true);
    
    try {
      const showDate = vm.game.lockTime;
      console.log('🎯 Fetching setlist for show date:', showDate);
      
      const result = await fetchLiveSetlist(showDate);
      console.log('📥 Setlist result:', result);
      
      if (result && result.setlist) {
        vm.finalizeScores(result.setlist);
        setCurrentView(View.RESULTS);
      } else {
        alert('Could not fetch setlist from Phish.net. The show may not have occurred yet or data is unavailable.');
      }
    } catch (error) {
      console.error('Error calculating results:', error);
      alert('Error fetching setlist. Please try again.');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleReset = () => {
    if (vm.resetGame()) {
      setVenueInfo('');
      setCurrentView(View.CREATE_GAME);
    }
  };

  const renderHome = () => (
    <Layout title="Rock 'n Jock">
      <div className="flex flex-col space-y-8 text-center pt-12">
        <div>
          <div className="text-7xl mb-4">🐠</div>
          <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Rock 'n Jock</h1>
          <p className="text-gray-500 mt-2 italic px-8">Predict the setlist and score points with your friends.</p>
        </div>
        <div className="px-6">
          <PrimaryButton label="Play the Game" onClick={() => setCurrentView(View.CREATE_GAME)} />
        </div>
      </div>
    </Layout>
  );

  const renderCreateGame = () => (
    <Layout 
      title="New Game" 
      leftAction={<button onClick={() => setCurrentView(View.HOME)}>Back</button>}
    >
      <ListSection title="Show Details">
        <IOSInput 
          label="Show Date" 
          type="date" 
          placeholder="Select Date" 
          value={showDate} 
          onChange={setShowDate} 
        />
        <ListItem 
          label="Location" 
          value={
            isFetchingVenue ? (
              <span className="text-blue-500 animate-pulse">Searching...</span>
            ) : (
              <span className="text-gray-500 text-right text-[15px]">{venueInfo || 'Pick a date'}</span>
            )
          }
        />
      </ListSection>
      <div className="px-2">
        <PrimaryButton 
          label="Start Game" 
          disabled={!showDate || isFetchingVenue || venueInfo === 'No show found for this date'}
          onClick={() => {
            vm.createGame(showDate, venueInfo);
            setCurrentView(View.LOBBY);
          }} 
        />
      </div>
    </Layout>
  );

  const renderLobby = () => {
    const allComplete = vm.game?.players.every(p => calculateCompletion(p.picks) === 10) ?? false;
    const incompletePlayers = vm.game?.players.filter(p => calculateCompletion(p.picks) < 10) ?? [];
    
    return (
      <Layout 
        title="Lobby" 
        leftAction={<button onClick={handleReset}>New</button>}
        rightAction={<button onClick={handleCopyLink}>{copyFeedback ? "Copied" : "Share"}</button>}
      >
        {vm.game?.venue && (
          <div className="mb-4 text-center">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{vm.game.lockTime}</h3>
            <p className="text-sm font-medium text-gray-600">{vm.game.venue}</p>
            {vm.game.isLocked && (
              <div className="mt-2 inline-block bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">
                🔒 LOCKED
              </div>
            )}
          </div>
        )}
        
        <ListSection title="Players">
          {vm.game?.players.map(p => {
            const completion = calculateCompletion(p.picks);
            const isComplete = completion === 10;
            
            return (
              <div key={p.id} className="flex items-center justify-between p-4 border-b border-gray-100 last:border-0 bg-white">
                <div className="flex-1" onClick={() => {
                  setActivePlayerId(p.id);
                  setCurrentView(View.PICKS);
                }}>
                  <div className="flex items-center space-x-3">
                    <span className="text-lg font-bold">{p.name}</span>
                    {isComplete ? (
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-bold">✅ Ready</span>
                    ) : (
                      <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-bold">⏳ {completion}/10</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {vm.game?.status === 'completed' ? `${p.score} pts` : "Tap to edit picks"}
                  </div>
                </div>
                {!vm.game?.isLocked && (
                  <button 
                    onClick={() => vm.removePlayer(p.id)}
                    className="ml-4 text-red-500 hover:text-red-700 text-sm font-bold"
                  >
                    Remove
                  </button>
                )}
              </div>
            );
          })}
          
          {!vm.game?.isLocked && (
            <IOSInput 
              label="Add Player" 
              placeholder="Enter Name" 
              value={newPlayerName} 
              onChange={setNewPlayerName} 
              suffix={
                <button 
                  onClick={() => { 
                    if(newPlayerName) { 
                      vm.addPlayer(newPlayerName); 
                      setNewPlayerName(''); 
                    } 
                  }} 
                  className="text-[#007AFF] font-bold"
                >
                  Add
                </button>
              }
            />
          )}
        </ListSection>
        
        <div className="space-y-3 px-2">
          {!vm.game?.isLocked && (
            <>
              {!allComplete && incompletePlayers.length > 0 && (
                <div className="text-center text-sm text-gray-500 mb-2">
                  Waiting on: {incompletePlayers.map(p => `${p.name} (${10 - calculateCompletion(p.picks)} fields)`).join(', ')}
                </div>
              )}
              
              <PrimaryButton 
                label="Lock Game" 
                disabled={!allComplete || (vm.game?.players.length ?? 0) === 0}
                onClick={vm.lockGame} 
              />
              
              {allComplete && (
                <div className="text-center text-xs text-gray-500">
                  Locking freezes players + picks for live scoring
                </div>
              )}
            </>
          )}
          
          {vm.game?.isLocked && vm.game?.status !== 'completed' && (
            <PrimaryButton 
              label={isCalculating ? "Calculating..." : "Calculate & View Results"}
              disabled={isCalculating}
              onClick={handleCalculateResults} 
            />
          )}
          
          {vm.game?.status === 'completed' && (
            <PrimaryButton label="View Results" onClick={() => setCurrentView(View.RESULTS)} />
          )}
        </div>
      </Layout>
    );
  };

  const renderPicks = () => {
    const player = vm.game?.players.find(p => p.id === activePlayerId);
    if (!player) return null;

    const completion = calculateCompletion(player.picks);
    const topInsights = [...vm.insights].sort((a, b) => b.probability - a.probability).slice(0, 5);

    return (
      <Layout 
        title={`${player.name}'s Picks`} 
        leftAction={<button onClick={() => setCurrentView(View.LOBBY)}>Lobby</button>}
        rightAction={
          !vm.game?.isLocked ? (
            <button 
              onClick={() => vm.refreshInsights(vm.game!.lockTime)}
              disabled={vm.loadingInsights}
              className="text-xs font-bold uppercase"
            >
              {vm.loadingInsights ? "..." : "Refresh Stats"}
            </button>
          ) : undefined
        }
      >
        {vm.game?.isLocked && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-red-700 text-sm font-medium text-center">🔒 Game locked - picks cannot be edited</p>
          </div>
        )}
        
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-3">
          <p className="text-blue-700 text-sm font-bold text-center">Progress: {completion} / 10</p>
        </div>

        {!vm.game?.isLocked && vm.loadingInsights ? (
          <div className="flex items-center justify-center p-6 space-x-3 bg-white rounded-xl mb-6 shadow-sm">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-medium text-gray-500">Retrieving tour probabilities...</span>
          </div>
        ) : !vm.game?.isLocked && vm.insights.length > 0 && topInsights.some(i => i.probability > 0) ? (
          <ListSection title="TOUR PREDICTION CHEAT SHEET">
            {topInsights.map((insight, idx) => (
              <ListItem 
                key={idx} 
                label={insight.song} 
                value={
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-400">{insight.lastPlayed}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${insight.probability > 70 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {insight.probability}%
                    </span>
                  </div>
                }
                onClick={() => {
                  if (insight.isFrequentOpener && !player.picks.opener && !vm.game?.isLocked) {
                    vm.updatePicks(player.id, { ...player.picks, opener: insight.song });
                  }
                }}
              />
            ))}
          </ListSection>
        ) : null}

        <ListSection title="MAIN SELECTIONS">
          <AutocompleteInput 
            label="Opener" 
            placeholder="Search songs..." 
            value={player.picks.opener} 
            insights={vm.insights}
            onChange={(v) => !vm.game?.isLocked && vm.updatePicks(player.id, { ...player.picks, opener: v })}
            disabled={vm.game?.isLocked}
          />
          <AutocompleteInput 
            label="S1 Closer" 
            placeholder="Search songs..." 
            value={player.picks.set1Closer} 
            insights={vm.insights}
            onChange={(v) => !vm.game?.isLocked && vm.updatePicks(player.id, { ...player.picks, set1Closer: v })}
            disabled={vm.game?.isLocked}
          />
          <AutocompleteInput 
            label="S2 Opener" 
            placeholder="Search songs..." 
            value={player.picks.set2Opener} 
            insights={vm.insights}
            onChange={(v) => !vm.game?.isLocked && vm.updatePicks(player.id, { ...player.picks, set2Opener: v })}
            disabled={vm.game?.isLocked}
          />
          <AutocompleteInput 
            label="S2 Closer" 
            placeholder="Search songs..." 
            value={player.picks.set2Closer} 
            insights={vm.insights}
            onChange={(v) => !vm.game?.isLocked && vm.updatePicks(player.id, { ...player.picks, set2Closer: v })}
            disabled={vm.game?.isLocked}
          />
          <AutocompleteInput 
            label="Encore" 
            placeholder="Search songs..." 
            value={player.picks.encore} 
            insights={vm.insights}
            onChange={(v) => !vm.game?.isLocked && vm.updatePicks(player.id, { ...player.picks, encore: v })}
            disabled={vm.game?.isLocked}
          />
        </ListSection>

        <ListSection title="WILDCARDS">
          <AutocompleteInput 
            label="Wildcard 1" 
            placeholder="Any Phish song" 
            value={player.picks.wildcards[0]} 
            insights={vm.insights}
            onChange={(v) => !vm.game?.isLocked && vm.updatePicks(player.id, { ...player.picks, wildcards: [v, player.picks.wildcards[1]] })}
            disabled={vm.game?.isLocked}
          />
          <AutocompleteInput 
            label="Wildcard 2" 
            placeholder="Any Phish song" 
            value={player.picks.wildcards[1]} 
            insights={vm.insights}
            onChange={(v) => !vm.game?.isLocked && vm.updatePicks(player.id, { ...player.picks, wildcards: [player.picks.wildcards[0], v] })}
            disabled={vm.game?.isLocked}
          />
        </ListSection>

        <ListSection title="ROCK N JOCK (5 PTS)">
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-3">
            <p className="text-xs text-orange-800 font-medium">
              🎯 High Risk, High Reward! Pick the exact song AND position in Set 1 or Set 2.
            </p>
          </div>
          
          <AutocompleteInput 
            label="Song" 
            placeholder="Search songs..." 
            value={player.picks.rockNJock.song} 
            insights={vm.insights}
            onChange={(v) => !vm.game?.isLocked && vm.updatePicks(player.id, { 
              ...player.picks, 
              rockNJock: { ...player.picks.rockNJock, song: v } 
            })}
            disabled={vm.game?.isLocked}
          />
          
          <div className="flex space-x-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 ml-4">Set</label>
              <select
                value={player.picks.rockNJock.set}
                onChange={(e) => !vm.game?.isLocked && vm.updatePicks(player.id, { 
                  ...player.picks, 
                  rockNJock: { ...player.picks.rockNJock, set: e.target.value as '1' | '2' | '' } 
                })}
                disabled={vm.game?.isLocked}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
              >
                <option value="">Select Set</option>
                <option value="1">Set 1</option>
                <option value="2">Set 2</option>
              </select>
            </div>
            
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 ml-4">Position</label>
              <input
                type="number"
                min="1"
                max="20"
                placeholder="1-20"
                value={player.picks.rockNJock.position || ''}
                onChange={(e) => !vm.game?.isLocked && vm.updatePicks(player.id, { 
                  ...player.picks, 
                  rockNJock: { ...player.picks.rockNJock, position: parseInt(e.target.value) || 0 } 
                })}
                disabled={vm.game?.isLocked}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
              />
            </div>
          </div>
        </ListSection>

        <div className="px-2">
          <PrimaryButton 
            label="Done" 
            onClick={() => setCurrentView(View.LOBBY)}
            disabled={vm.game?.isLocked && completion < 10}
          />
        </div>
      </Layout>
    );
  };

  const renderResults = () => {
    const sortedPlayers = [...(vm.game?.players || [])].sort((a, b) => b.score - a.score);
    const winner = sortedPlayers[0];
    
    return (
      <Layout 
        title="Results" 
        leftAction={<button onClick={() => setCurrentView(View.LOBBY)}>Lobby</button>}
      >
        {winner && (
          <div className="mb-6 text-center bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-2xl border-2 border-yellow-300">
            <div className="text-6xl mb-2">🏆</div>
            <h2 className="text-2xl font-black text-gray-900">{winner.name} Wins!</h2>
            <p className="text-3xl font-black text-yellow-600 mt-1">{winner.score} pts</p>
          </div>
        )}

        <ListSection title="Leaderboard">
          {sortedPlayers.map((p, i) => (
            <div key={p.id} className="p-4 border-b border-gray-100 last:border-0 bg-white">
              <div className="flex justify-between items-center mb-3">
                <span className="text-lg font-bold">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} {p.name}</span>
                <span className="text-xl font-black text-[#007AFF]">{p.score} pts</span>
              </div>
              
              <div className="space-y-1">
                {p.breakdown.opener && (
                  <div className="flex items-center text-sm">
                    <span className="text-green-600 font-bold mr-2">✅</span>
                    <span className="text-gray-700">Opener: <span className="font-semibold">{p.picks.opener}</span></span>
                    <span className="ml-auto text-green-600 font-bold">2 pts</span>
                  </div>
                )}
                {p.breakdown.set1Closer && (
                  <div className="flex items-center text-sm">
                    <span className="text-green-600 font-bold mr-2">✅</span>
                    <span className="text-gray-700">S1 Closer: <span className="font-semibold">{p.picks.set1Closer}</span></span>
                    <span className="ml-auto text-green-600 font-bold">2 pts</span>
                  </div>
                )}
                {p.breakdown.set2Opener && (
                  <div className="flex items-center text-sm">
                    <span className="text-green-600 font-bold mr-2">✅</span>
                    <span className="text-gray-700">S2 Opener: <span className="font-semibold">{p.picks.set2Opener}</span></span>
                    <span className="ml-auto text-green-600 font-bold">2 pts</span>
                  </div>
                )}
                {p.breakdown.set2Closer && (
                  <div className="flex items-center text-sm">
                    <span className="text-green-600 font-bold mr-2">✅</span>
                    <span className="text-gray-700">S2 Closer: <span className="font-semibold">{p.picks.set2Closer}</span></span>
                    <span className="ml-auto text-green-600 font-bold">2 pts</span>
                  </div>
                )}
                {p.breakdown.encore && (
                  <div className="flex items-center text-sm">
                    <span className="text-green-600 font-bold mr-2">✅</span>
                    <span className="text-gray-700">Encore: <span className="font-semibold">{p.picks.encore}</span></span>
                    <span className="ml-auto text-green-600 font-bold">2 pts</span>
                  </div>
                )}
                {p.breakdown.wildcards[0] && (
                  <div className="flex items-center text-sm">
                    <span className="text-green-600 font-bold mr-2">✅</span>
                    <span className="text-gray-700">Wildcard: <span className="font-semibold">{p.picks.wildcards[0]}</span></span>
                    <span className="ml-auto text-green-600 font-bold">1 pt</span>
                  </div>
                )}
                {p.breakdown.wildcards[1] && (
                  <div className="flex items-center text-sm">
                    <span className="text-green-600 font-bold mr-2">✅</span>
                    <span className="text-gray-700">Wildcard: <span className="font-semibold">{p.picks.wildcards[1]}</span></span>
                    <span className="ml-auto text-green-600 font-bold">1 pt</span>
                  </div>
                )}
                {p.breakdown.rockNJock && (
                  <div className="flex items-center text-sm">
                    <span className="text-green-600 font-bold mr-2">🎯</span>
                    <span className="text-gray-700">Rock n Jock: <span className="font-semibold">{p.picks.rockNJock.song}</span> (Set {p.picks.rockNJock.set}, Pos {p.picks.rockNJock.position})</span>
                    <span className="ml-auto text-green-600 font-bold">5 pts</span>
                  </div>
                )}
                {p.score === 0 && (
                  <div className="text-sm text-gray-400 italic">No correct picks</div>
                )}
              </div>
            </div>
          ))}
        </ListSection>
        
        <div className="px-2 pb-10">
          <PrimaryButton label="New Game" variant="secondary" onClick={handleReset} />
        </div>
      </Layout>
    );
  };

  switch (currentView) {
    case View.CREATE_GAME: return renderCreateGame();
    case View.LOBBY: return renderLobby();
    case View.PICKS: return renderPicks();
    case View.RESULTS: return renderResults();
    default: return renderHome();
  }
};

export default App;