import React, { useState, useEffect, useCallback, useRef } from 'react';

// MLB Teams data for colors and display
const MLB_TEAMS = {
  108: { name: "Angels", abbreviation: "LAA", color: "#BA0021" },
  109: { name: "Diamondbacks", abbreviation: "ARI", color: "#A71930" },
  110: { name: "Orioles", abbreviation: "BAL", color: "#DF4601" },
  111: { name: "Red Sox", abbreviation: "BOS", color: "#BD3039" },
  112: { name: "Cubs", abbreviation: "CHC", color: "#0E3386" },
  113: { name: "Reds", abbreviation: "CIN", color: "#C6011F" },
  114: { name: "Guardians", abbreviation: "CLE", color: "#00385D" },
  115: { name: "Rockies", abbreviation: "COL", color: "#333366" },
  116: { name: "Tigers", abbreviation: "DET", color: "#0C2340" },
  117: { name: "Astros", abbreviation: "HOU", color: "#002D62" },
  118: { name: "Royals", abbreviation: "KC", color: "#004687" },
  119: { name: "Dodgers", abbreviation: "LAD", color: "#005A9C" },
  120: { name: "Nationals", abbreviation: "WSH", color: "#AB0003" },
  121: { name: "Mets", abbreviation: "NYM", color: "#002D72" },
  133: { name: "Athletics", abbreviation: "OAK", color: "#003831" },
  134: { name: "Pirates", abbreviation: "PIT", color: "#27251F" },
  135: { name: "Padres", abbreviation: "SD", color: "#2F241D" },
  136: { name: "Mariners", abbreviation: "SEA", color: "#0C2C56" },
  137: { name: "Giants", abbreviation: "SF", color: "#FD5A1E" },
  138: { name: "Cardinals", abbreviation: "STL", color: "#C41E3A" },
  139: { name: "Rays", abbreviation: "TB", color: "#092C5C" },
  140: { name: "Rangers", abbreviation: "TEX", color: "#003278" },
  141: { name: "Blue Jays", abbreviation: "TOR", color: "#134A8E" },
  142: { name: "Twins", abbreviation: "MIN", color: "#002B5C" },
  143: { name: "Phillies", abbreviation: "PHI", color: "#E81828" },
  144: { name: "Braves", abbreviation: "ATL", color: "#CE1141" },
  145: { name: "White Sox", abbreviation: "CWS", color: "#27251F" },
  146: { name: "Marlins", abbreviation: "MIA", color: "#00A3E0" },
  147: { name: "Yankees", abbreviation: "NYY", color: "#003087" },
  158: { name: "Brewers", abbreviation: "MIL", color: "#12284B" }
};

// Fallback static game data
const STATIC_GAME_DATA = {
  homeTeam: { name: "Yankees", abbreviation: "NYY", color: "#003087", record: "92-70" },
  awayTeam: { name: "Red Sox", abbreviation: "BOS", color: "#BD3039", record: "88-74" },
  date: "October 5, 2024",
  venue: "Yankee Stadium",
  innings: [[2, 0], [0, 1], [1, 0], [0, 2], [0, 0], [3, 1], [0, 0], [0, 3], [0, 2]],
  plays: [
    { inning: 1, half: "top", event: "2-run HR by Martinez", awayScore: 2, homeScore: 0 },
    { inning: 2, half: "bottom", event: "RBI single by Judge", awayScore: 2, homeScore: 1 },
    { inning: 3, half: "top", event: "Solo HR by Devers", awayScore: 3, homeScore: 1 },
    { inning: 4, half: "bottom", event: "2-run double by Stanton", awayScore: 3, homeScore: 3 },
    { inning: 6, half: "top", event: "RBI single by Verdugo", awayScore: 4, homeScore: 3 },
    { inning: 6, half: "top", event: "2-run HR by Bogaerts", awayScore: 6, homeScore: 3 },
    { inning: 6, half: "bottom", event: "Solo HR by Torres", awayScore: 6, homeScore: 4 },
    { inning: 8, half: "bottom", event: "2-run HR by Rizzo", awayScore: 6, homeScore: 6 },
    { inning: 8, half: "bottom", event: "RBI triple by Volpe", awayScore: 6, homeScore: 7 },
    { inning: 9, half: "bottom", event: "Walk-off 2-run HR by Judge!", awayScore: 6, homeScore: 9 },
  ]
};

// API Functions
const fetchGamesForDate = async (date) => {
  try {
    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${date}&hydrate=linescore,team`
    );
    const data = await response.json();
    return data.dates?.[0]?.games || [];
  } catch (error) {
    console.error('Error fetching games:', error);
    return [];
  }
};

const fetchGameDetails = async (gamePk) => {
  try {
    const [linescoreRes, playsRes] = await Promise.all([
      fetch(`https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`),
      fetch(`https://statsapi.mlb.com/api/v1/game/${gamePk}/playByPlay`)
    ]);

    const linescoreData = await linescoreRes.json();
    const playsData = await playsRes.json();

    return { linescore: linescoreData, plays: playsData };
  } catch (error) {
    console.error('Error fetching game details:', error);
    return null;
  }
};

const parseGameData = (gameData, playsData) => {
  const game = gameData.gameData;
  const linescore = gameData.liveData?.linescore;

  if (!game || !linescore) return null;

  const homeTeamId = game.teams.home.id;
  const awayTeamId = game.teams.away.id;

  const homeTeamInfo = MLB_TEAMS[homeTeamId] || {
    name: game.teams.home.name,
    abbreviation: game.teams.home.abbreviation,
    color: "#333333"
  };

  const awayTeamInfo = MLB_TEAMS[awayTeamId] || {
    name: game.teams.away.name,
    abbreviation: game.teams.away.abbreviation,
    color: "#666666"
  };

  // Parse innings
  const innings = linescore.innings?.map(inning => [
    inning.away?.runs || 0,
    inning.home?.runs || 0
  ]) || [];

  // Parse scoring plays
  const scoringPlays = [];
  let currentAwayScore = 0;
  let currentHomeScore = 0;

  if (playsData?.allPlays) {
    playsData.allPlays.forEach(play => {
      if (play.result?.event && play.about?.inning) {
        const isTop = play.about.isTopInning;

        // Count actual runners who scored by checking runner movements.
        // Don't rely solely on isScoringPlay - the API can mark it false even when
        // runs score (e.g. runs scoring on wild pitches/passed balls during a strikeout).
        let runsScored = 0;
        if (play.runners) {
          const scoredRunnerIds = new Set();
          play.runners.forEach(runner => {
            const end = runner.movement?.end;
            const isOut = runner.movement?.isOut;
            const runnerId = runner.details?.runner?.id;
            if (!isOut && (end === 'score' || end === '4B')) {
              if (runnerId) {
                scoredRunnerIds.add(runnerId);
              } else {
                runsScored++;
              }
            }
          });
          runsScored += scoredRunnerIds.size;
        }
        const isScoring = runsScored > 0 || (play.about?.isScoringPlay || false);
        if (isScoring && runsScored === 0) runsScored = play.result.rbi || 1;

        if (runsScored > 0) {
          if (isTop) {
            currentAwayScore += runsScored;
          } else {
            currentHomeScore += runsScored;
          }
        }

        if (!isScoring) return;

        const batter = play.matchup?.batter?.fullName || 'Unknown';
        const eventType = play.result.event;

        // For runner events, show the runner's name instead of the batter
        const runnerEventKeywords = ['Caught Stealing', 'Stolen Base', 'Picked Off', 'Pickoff'];
        let displayName = batter;
        if (runnerEventKeywords.some(kw => eventType.includes(kw)) && play.runners) {
          for (const runner of play.runners) {
            const runnerEvt = runner.details?.event || '';
            if (runnerEventKeywords.some(kw => runnerEvt.includes(kw))) {
              const runnerFullName = runner.details?.runner?.fullName;
              if (runnerFullName) {
                displayName = runnerFullName;
                break;
              }
            }
          }
        }

        scoringPlays.push({
          inning: play.about.inning,
          half: isTop ? "top" : "bottom",
          event: `${eventType} by ${displayName}`,
          awayScore: currentAwayScore,
          homeScore: currentHomeScore
        });
      }
    });
  }

  // If no scoring plays found, generate from innings
  if (scoringPlays.length === 0 && innings.length > 0) {
    innings.forEach((inning, idx) => {
      if (inning[0] > 0) {
        currentAwayScore += inning[0];
        scoringPlays.push({
          inning: idx + 1,
          half: "top",
          event: `${inning[0]} run(s) scored`,
          awayScore: currentAwayScore,
          homeScore: currentHomeScore
        });
      }
      if (inning[1] > 0) {
        currentHomeScore += inning[1];
        scoringPlays.push({
          inning: idx + 1,
          half: "bottom",
          event: `${inning[1]} run(s) scored`,
          awayScore: currentAwayScore,
          homeScore: currentHomeScore
        });
      }
    });
  }

  return {
    homeTeam: {
      ...homeTeamInfo,
      record: `${game.teams.home.record?.wins || 0}-${game.teams.home.record?.losses || 0}`
    },
    awayTeam: {
      ...awayTeamInfo,
      record: `${game.teams.away.record?.wins || 0}-${game.teams.away.record?.losses || 0}`
    },
    date: new Date(game.datetime.dateTime).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    venue: game.venue?.name || 'Unknown Venue',
    innings,
    plays: scoringPlays
  };
};

// UI Components
const FlipDigit = ({ value, size = "large" }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isFlipping, setIsFlipping] = useState(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      setIsFlipping(true);
      const timer = setTimeout(() => {
        setDisplayValue(value);
        setIsFlipping(false);
      }, 150);
      prevValue.current = value;
      return () => clearTimeout(timer);
    }
  }, [value]);

  const sizeClasses = size === "large" ? "w-12 h-16 text-4xl" : size === "medium" ? "w-8 h-12 text-2xl" : "w-6 h-8 text-lg";

  return (
    <div
      className={`${sizeClasses} bg-gray-900 rounded-sm flex items-center justify-center font-mono font-bold text-amber-400 relative overflow-hidden border border-gray-700 shadow-inner`}
      style={{
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)',
        transform: isFlipping ? 'rotateX(90deg)' : 'rotateX(0deg)',
        transition: 'transform 0.15s ease-in-out'
      }}
    >
      <div className="absolute inset-x-0 top-1/2 h-px bg-gray-800 opacity-50"></div>
      {displayValue}
    </div>
  );
};

const ScoreDisplay = ({ score, size = "large" }) => {
  const digits = String(score).padStart(2, ' ').split('');
  return (
    <div className="flex gap-1">
      {digits.map((digit, i) => (
        <FlipDigit key={i} value={digit === ' ' ? '' : digit} size={size} />
      ))}
    </div>
  );
};

const InningCell = ({ value, revealed, isCurrentInning }) => (
  <div className={`w-10 h-10 flex items-center justify-center font-mono text-lg border-r border-gray-700 transition-all duration-300 ${isCurrentInning ? 'bg-amber-900/30' : ''}`}>
    {revealed ? (
      <span className={`${value > 0 ? 'text-amber-400 font-bold' : 'text-gray-500'}`}>{value}</span>
    ) : (
      <span className="text-gray-700">-</span>
    )}
  </div>
);

const TeamRow = ({ team, innings, totalScore, revealedInnings, currentInning, isWinning }) => (
  <div className={`flex items-center border-b border-gray-700 ${isWinning ? 'bg-green-900/20' : ''}`}>
    <div className="w-20 h-12 flex items-center justify-center font-bold text-lg border-r border-gray-700" style={{ backgroundColor: team.color + '40', color: team.color }}>
      {team.abbreviation}
    </div>
    <div className="flex overflow-x-auto">
      {innings.map((score, i) => (
        <InningCell key={i} value={score} revealed={i < revealedInnings} isCurrentInning={i === currentInning} />
      ))}
    </div>
    <div className="w-16 h-12 flex items-center justify-center border-l-2 border-amber-600 bg-gray-800">
      <ScoreDisplay score={totalScore} size="small" />
    </div>
  </div>
);

const PlayCard = ({ play, homeTeam, awayTeam, isNew }) => {
  const isHomePlay = play.half === "bottom";
  const team = isHomePlay ? homeTeam : awayTeam;

  return (
    <div className={`p-3 rounded-lg border-l-4 mb-2 transition-all duration-500 ${isNew ? 'animate-pulse bg-amber-900/30' : 'bg-gray-800/50'}`} style={{ borderLeftColor: team.color }}>
      <div className="flex justify-between items-start">
        <div>
          <span className="text-xs text-gray-400">{play.half === "top" ? "▲" : "▼"} {play.inning}{getOrdinalSuffix(play.inning)}</span>
          <p className="text-white font-medium mt-1">{play.event}</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-400">{awayTeam.abbreviation} - {homeTeam.abbreviation}</div>
          <div className="font-mono text-amber-400 font-bold">{play.awayScore} - {play.homeScore}</div>
        </div>
      </div>
    </div>
  );
};

function getOrdinalSuffix(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

const SpeedButton = ({ speed, currentSpeed, onClick, label }) => (
  <button
    onClick={() => onClick(speed)}
    className={`px-4 py-2 rounded-lg font-medium transition-all ${currentSpeed === speed ? 'bg-amber-600 text-white shadow-lg' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
  >
    {label}
  </button>
);

const GameCard = ({ game, onSelect }) => {
  const homeTeam = MLB_TEAMS[game.teams.home.team.id] || { abbreviation: game.teams.home.team.abbreviation, color: "#333" };
  const awayTeam = MLB_TEAMS[game.teams.away.team.id] || { abbreviation: game.teams.away.team.abbreviation, color: "#666" };
  const isFinal = game.status.abstractGameState === "Final";

  return (
    <button
      onClick={() => onSelect(game)}
      disabled={!isFinal}
      className={`w-full p-4 rounded-xl border transition-all ${isFinal ? 'bg-gray-800/50 border-gray-700 hover:border-amber-600 hover:bg-gray-800' : 'bg-gray-900/50 border-gray-800 opacity-50 cursor-not-allowed'}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: awayTeam.color }}>
            {awayTeam.abbreviation?.charAt(0) || 'A'}
          </div>
          <span className="text-gray-400">@</span>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: homeTeam.color }}>
            {homeTeam.abbreviation?.charAt(0) || 'H'}
          </div>
        </div>
        <div className="text-right">
          <div className="text-white font-medium">
            {awayTeam.abbreviation || game.teams.away.team.abbreviation} @ {homeTeam.abbreviation || game.teams.home.team.abbreviation}
          </div>
          <div className={`text-sm ${isFinal ? 'text-green-400' : 'text-yellow-400'}`}>
            {isFinal ? 'Final - Ready to replay' : game.status.detailedState}
          </div>
        </div>
      </div>
    </button>
  );
};

// Main Component
export default function GameReplayWithAPI() {
  // View state
  const [view, setView] = useState('search'); // 'search', 'loading', 'warning', 'replay'

  // Search state
  const [selectedDate, setSelectedDate] = useState(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  });
  const [games, setGames] = useState([]);
  const [isLoadingGames, setIsLoadingGames] = useState(false);
  const [useStatic, setUseStatic] = useState(false);

  // Game state
  const [gameData, setGameData] = useState(null);
  const [mode, setMode] = useState('inning');
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(2000);
  const [currentStep, setCurrentStep] = useState(0);

  const maxSteps = gameData ? (mode === 'inning' ? gameData.innings.length : gameData.plays.length) : 0;

  // Fetch games when date changes
  useEffect(() => {
    if (view !== 'search') return;

    const loadGames = async () => {
      setIsLoadingGames(true);
      const fetchedGames = await fetchGamesForDate(selectedDate);
      setGames(fetchedGames);
      setIsLoadingGames(false);
    };

    loadGames();
  }, [selectedDate, view]);

  // Calculate scores
  const getCurrentScores = useCallback(() => {
    if (!gameData) return { away: 0, home: 0 };

    if (mode === 'inning') {
      let away = 0, home = 0;
      for (let i = 0; i < currentStep; i++) {
        away += gameData.innings[i]?.[0] || 0;
        home += gameData.innings[i]?.[1] || 0;
      }
      return { away, home };
    } else {
      if (currentStep === 0) return { away: 0, home: 0 };
      const lastPlay = gameData.plays[currentStep - 1];
      return { away: lastPlay?.awayScore || 0, home: lastPlay?.homeScore || 0 };
    }
  }, [mode, currentStep, gameData]);

  const scores = getCurrentScores();

  // Auto-advance
  useEffect(() => {
    if (!isPlaying || currentStep >= maxSteps) {
      if (currentStep >= maxSteps) setIsPlaying(false);
      return;
    }

    const timer = setTimeout(() => {
      setCurrentStep(prev => prev + 1);
    }, speed);

    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, speed, maxSteps]);

  const handleSelectGame = async (game) => {
    setView('loading');

    const details = await fetchGameDetails(game.gamePk);
    if (details) {
      const parsed = parseGameData(details.linescore, details.plays);
      if (parsed && parsed.innings.length > 0) {
        setGameData(parsed);
        setView('warning');
        return;
      }
    }

    // Fallback to static data
    setGameData(STATIC_GAME_DATA);
    setUseStatic(true);
    setView('warning');
  };

  const handleUseStaticData = () => {
    setGameData(STATIC_GAME_DATA);
    setUseStatic(true);
    setView('warning');
  };

  const handleStartReplay = () => {
    setCurrentStep(0);
    setIsPlaying(false);
    setView('replay');
  };

  const handleBack = () => {
    setView('search');
    setGameData(null);
    setCurrentStep(0);
    setIsPlaying(false);
    setUseStatic(false);
  };

  const handlePlayPause = () => {
    if (currentStep >= maxSteps) setCurrentStep(0);
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStep(0);
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setCurrentStep(0);
    setIsPlaying(false);
  };

  // Search View
  if (view === 'search') {
    return (
      <div className="min-h-screen bg-gray-950 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">⚾</div>
            <h1 className="text-3xl font-bold text-white mb-2">Game Replay</h1>
            <p className="text-gray-400">Experience the game without spoilers</p>
          </div>

          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-6">
            <label className="block text-gray-400 text-sm mb-2">Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-600"
            />
          </div>

          <div className="space-y-3">
            {isLoadingGames ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-400">Loading games...</p>
              </div>
            ) : games.length > 0 ? (
              <>
                <p className="text-gray-400 text-sm mb-4">{games.length} game(s) found</p>
                {games.map((game) => (
                  <GameCard key={game.gamePk} game={game} onSelect={handleSelectGame} />
                ))}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">No games found for this date</p>
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-800">
            <button
              onClick={handleUseStaticData}
              className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 py-4 rounded-xl transition-all"
            >
              Use Demo Game (NYY vs BOS)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading View
  if (view === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading game data...</p>
        </div>
      </div>
    );
  }

  // Spoiler Warning View
  if (view === 'warning' && gameData) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-900 rounded-2xl p-8 text-center border border-gray-800 shadow-2xl">
          <div className="text-6xl mb-4">⚾</div>
          <h1 className="text-3xl font-bold text-white mb-2">Ready to Replay</h1>
          <div className="text-amber-400 font-semibold mb-6">Spoiler-Free Experience</div>

          {useStatic && (
            <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 mb-4 text-yellow-400 text-sm">
              Using demo data
            </div>
          )}

          <div className="bg-gray-800/50 rounded-xl p-4 mb-6 text-left">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: gameData.awayTeam.color }}>
                {gameData.awayTeam.abbreviation.charAt(0)}
              </div>
              <div>
                <div className="text-white font-semibold">{gameData.awayTeam.name}</div>
                <div className="text-gray-400 text-sm">{gameData.awayTeam.record}</div>
              </div>
            </div>
            <div className="text-center text-gray-500 text-sm mb-3">@</div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: gameData.homeTeam.color }}>
                {gameData.homeTeam.abbreviation.charAt(0)}
              </div>
              <div>
                <div className="text-white font-semibold">{gameData.homeTeam.name}</div>
                <div className="text-gray-400 text-sm">{gameData.homeTeam.record}</div>
              </div>
            </div>
          </div>

          <div className="text-gray-400 text-sm mb-6">
            {gameData.date} • {gameData.venue}
          </div>

          <button
            onClick={handleStartReplay}
            className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-105 shadow-lg mb-4"
          >
            Experience the Game
          </button>

          <button
            onClick={handleBack}
            className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 py-3 rounded-xl transition-all"
          >
            ← Choose Different Game
          </button>
        </div>
      </div>
    );
  }

  // Replay View
  if (view === 'replay' && gameData) {
    const isGameOver = currentStep >= maxSteps;
    const winner = scores.home > scores.away ? 'home' : scores.away > scores.home ? 'away' : null;

    return (
      <div className="min-h-screen bg-gray-950 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handleBack}
              className="text-gray-400 hover:text-white transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <div className="text-center">
              <div className="text-amber-400 text-sm font-medium">{gameData.date}</div>
              <div className="text-gray-400 text-xs">{gameData.venue}</div>
            </div>
            <div className="w-16"></div>
          </div>

          {/* Scoreboard */}
          <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-800 mb-6">
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-4 flex items-center justify-between border-b border-gray-700">
              <h2 className="text-white font-bold tracking-wider">SCOREBOARD</h2>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                <span className="text-gray-400 text-sm">{isGameOver ? 'FINAL' : isPlaying ? 'LIVE' : 'PAUSED'}</span>
              </div>
            </div>

            {/* Big Score */}
            <div className="p-6 bg-gradient-to-b from-gray-900 to-gray-950">
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <div className="text-2xl font-bold mb-2" style={{ color: gameData.awayTeam.color }}>{gameData.awayTeam.abbreviation}</div>
                  <ScoreDisplay score={scores.away} />
                  {isGameOver && winner === 'away' && <div className="mt-2 text-green-400 text-sm font-bold">WINNER</div>}
                </div>
                <div className="text-center">
                  <div className="text-gray-600 text-4xl font-light">-</div>
                  {currentStep > 0 && !isGameOver && (
                    <div className="text-amber-400 text-sm mt-2">
                      {mode === 'inning' ? `After ${currentStep} inning${currentStep > 1 ? 's' : ''}` : `${gameData.plays[currentStep - 1]?.half === 'top' ? '▲' : '▼'} ${gameData.plays[currentStep - 1]?.inning}`}
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold mb-2" style={{ color: gameData.homeTeam.color }}>{gameData.homeTeam.abbreviation}</div>
                  <ScoreDisplay score={scores.home} />
                  {isGameOver && winner === 'home' && <div className="mt-2 text-green-400 text-sm font-bold">WINNER</div>}
                </div>
              </div>
            </div>

            {/* Inning Grid */}
            {mode === 'inning' && (
              <div className="border-t border-gray-700 overflow-x-auto">
                <div className="flex bg-gray-800 min-w-max">
                  <div className="w-20 h-8 flex items-center justify-center text-gray-400 text-sm font-medium border-r border-gray-700">TEAM</div>
                  <div className="flex">
                    {gameData.innings.map((_, i) => (
                      <div key={i} className={`w-10 h-8 flex items-center justify-center text-sm border-r border-gray-700 ${i === currentStep - 1 ? 'bg-amber-900/30 text-amber-400' : 'text-gray-400'}`}>{i + 1}</div>
                    ))}
                  </div>
                  <div className="w-16 h-8 flex items-center justify-center text-amber-400 text-sm font-bold border-l-2 border-amber-600">R</div>
                </div>
                <TeamRow team={gameData.awayTeam} innings={gameData.innings.map(i => i[0])} totalScore={scores.away} revealedInnings={currentStep} currentInning={currentStep - 1} isWinning={isGameOver && winner === 'away'} />
                <TeamRow team={gameData.homeTeam} innings={gameData.innings.map(i => i[1])} totalScore={scores.home} revealedInnings={currentStep} currentInning={currentStep - 1} isWinning={isGameOver && winner === 'home'} />
              </div>
            )}
          </div>

          {/* Play-by-Play */}
          {mode === 'play' && currentStep > 0 && (
            <div className="bg-gray-900 rounded-2xl p-4 mb-6 border border-gray-800 max-h-64 overflow-y-auto">
              <h3 className="text-gray-400 text-sm font-medium mb-3">SCORING PLAYS</h3>
              {gameData.plays.slice(0, currentStep).reverse().map((play, i) => (
                <PlayCard key={i} play={play} homeTeam={gameData.homeTeam} awayTeam={gameData.awayTeam} isNew={i === 0 && isPlaying} />
              ))}
            </div>
          )}

          {/* Mode Toggle */}
          <div className="flex justify-center gap-2 mb-4">
            <button onClick={() => handleModeChange('inning')} className={`px-6 py-2 rounded-lg font-medium transition-all ${mode === 'inning' ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              Inning-by-Inning
            </button>
            <button onClick={() => handleModeChange('play')} className={`px-6 py-2 rounded-lg font-medium transition-all ${mode === 'play' ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              Play-by-Play
            </button>
          </div>

          {/* Controls */}
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <div className="mb-6">
              <div className="text-gray-400 text-sm mb-3 text-center">PLAYBACK SPEED</div>
              <div className="flex justify-center gap-2 flex-wrap">
                <SpeedButton speed={4000} currentSpeed={speed} onClick={setSpeed} label="🐢 Slow" />
                <SpeedButton speed={2000} currentSpeed={speed} onClick={setSpeed} label="Normal" />
                <SpeedButton speed={800} currentSpeed={speed} onClick={setSpeed} label="🐇 Fast" />
                <SpeedButton speed={200} currentSpeed={speed} onClick={setSpeed} label="⚡ Rapid" />
              </div>
            </div>

            <div className="flex justify-center gap-3">
              <button onClick={handleReset} className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-all" title="Reset">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </button>
              <button onClick={() => currentStep > 0 && setCurrentStep(prev => prev - 1)} disabled={currentStep === 0} className="p-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg transition-all">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button onClick={handlePlayPause} className="p-4 bg-amber-600 hover:bg-amber-500 rounded-xl transition-all shadow-lg">
                {isPlaying ? (
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                ) : (
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                )}
              </button>
              <button onClick={() => currentStep < maxSteps && setCurrentStep(prev => prev + 1)} disabled={currentStep >= maxSteps} className="p-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg transition-all">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
              <button onClick={() => { setIsPlaying(false); setCurrentStep(maxSteps); }} className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-all">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
              </button>
            </div>

            <div className="mt-6">
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span>{mode === 'inning' ? 'Innings' : 'Scoring Plays'}</span>
                <span>{currentStep} / {maxSteps}</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-300" style={{ width: `${maxSteps > 0 ? (currentStep / maxSteps) * 100 : 0}%` }}></div>
              </div>
            </div>
          </div>

          <div className="text-center mt-6 text-gray-600 text-sm">⚾ Game Replay • Experience the drama without spoilers</div>
        </div>
      </div>
    );
  }

  return null;
}
