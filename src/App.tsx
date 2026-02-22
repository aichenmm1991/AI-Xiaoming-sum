/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  RotateCcw, 
  Timer, 
  Play, 
  Pause, 
  ChevronRight,
  AlertCircle,
  Zap
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { Block, GameMode } from './types';
import { 
  GRID_ROWS, 
  GRID_COLS, 
  INITIAL_ROWS, 
  TIME_LIMIT, 
} from './constants';
import { 
  createBlock, 
  createInitialGrid, 
  generateTarget, 
  getSelectedSum 
} from './utils';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [language, setLanguage] = useState<'zh' | 'en'>('zh');
  const [grid, setGrid] = useState<(Block | null)[][]>(() => createInitialGrid(INITIAL_ROWS));
  const [target, setTarget] = useState(() => generateTarget());
  const [score, setScore] = useState(0);
  const [mode, setMode] = useState<GameMode>('classic');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [isPaused, setIsPaused] = useState(false);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('sumstack_highscore');
    return saved ? parseInt(saved) : 0;
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const t = {
    zh: {
      title: '数块消除',
      subtitle: '凑出目标数字消除方块，防止触顶。',
      classic: '经典模式',
      classicSub: 'ENDLESS SURVIVAL',
      time: '计时模式',
      timeSub: 'COUNTDOWN CHALLENGE',
      highScore: '最高分',
      target: '目标数字',
      score: '当前得分',
      gameOver: '游戏结束',
      gameOverSub: '方块已触顶',
      restart: '重新开始',
      paused: '已暂停',
      resume: '继续游戏',
      instructions: '游戏说明',
      obj: '01. 游戏目标',
      objDesc: '点击方块凑齐目标数字。消除方块以生存。',
      warn: '02. 警告',
      warnDesc: '如果方块堆积到最顶层，游戏即告结束。',
      lang: 'English'
    },
    en: {
      title: 'SumStack',
      subtitle: 'Sum blocks to clear them and prevent reaching the top.',
      classic: 'Classic Mode',
      classicSub: 'ENDLESS SURVIVAL',
      time: 'Time Mode',
      timeSub: 'COUNTDOWN CHALLENGE',
      highScore: 'High Score',
      target: 'Target Sum',
      score: 'Score',
      gameOver: 'Game Over',
      gameOverSub: 'Grid capacity exceeded',
      restart: 'Restart',
      paused: 'Paused',
      resume: 'Resume',
      instructions: 'Instructions',
      obj: '01. Objective',
      objDesc: 'Select blocks to reach the target sum. Clear blocks to survive.',
      warn: '02. Warning',
      warnDesc: 'If blocks reach the top row, system failure occurs.',
      lang: '中文'
    }
  }[language];

  const startGame = (selectedMode: GameMode) => {
    setMode(selectedMode);
    setGameStarted(true);
    resetGame();
  };

  const backToMenu = () => {
    setGameStarted(false);
    setGameOver(false);
  };

  // Sound effects (simulated with visual feedback for now, but structure is here)
  const playSound = (type: 'select' | 'clear' | 'error' | 'gameover') => {
    // In a real app, we'd use Audio objects
  };

  const addRow = useCallback(() => {
    setGrid(prev => {
      // Check for game over
      const topRowHasBlocks = prev[0].some(b => b !== null);
      if (topRowHasBlocks) {
        setGameOver(true);
        return prev;
      }

      const newGrid = Array.from({ length: GRID_ROWS }, () =>
        Array.from({ length: GRID_COLS }, () => null as Block | null)
      );

      // Move existing blocks up
      for (let r = 1; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          const block = prev[r][c];
          if (block) {
            newGrid[r - 1][c] = { ...block, row: r - 1 };
          }
        }
      }

      // Add new row at bottom
      for (let c = 0; c < GRID_COLS; c++) {
        newGrid[GRID_ROWS - 1][c] = createBlock(GRID_ROWS - 1, c);
      }

      return newGrid;
    });
  }, []);

  // Timer logic for Time Mode
  useEffect(() => {
    if (mode === 'time' && !gameOver && !isPaused) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            addRow();
            return TIME_LIMIT;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mode, gameOver, isPaused, addRow]);

  const handleBlockClick = (block: Block) => {
    if (gameOver || isPaused) return;

    setSelectedIds(prev => {
      const isSelected = prev.includes(block.id);
      const next = isSelected 
        ? prev.filter(id => id !== block.id) 
        : [...prev, block.id];
      
      const currentSum = getSelectedSum(grid, next);
      
      if (currentSum === target) {
        // Success!
        handleSuccess(next);
        return [];
      } else if (currentSum > target) {
        // Error!
        playSound('error');
        return [];
      }
      
      playSound('select');
      return next;
    });
  };

  const handleSuccess = (ids: string[]) => {
    playSound('clear');
    confetti({
      particleCount: 40,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#34d399', '#6ee7b7']
    });

    setScore(prev => {
      const newScore = prev + ids.length * 10;
      if (newScore > highScore) {
        setHighScore(newScore);
        localStorage.setItem('sumstack_highscore', newScore.toString());
      }
      return newScore;
    });

    setGrid(prev => {
      const newGrid = prev.map(row => 
        row.map(block => (block && ids.includes(block.id) ? null : block))
      );
      
      // Apply gravity: blocks fall down to fill holes
      for (let c = 0; c < GRID_COLS; c++) {
        const column: (Block | null)[] = [];
        for (let r = GRID_ROWS - 1; r >= 0; r--) {
          if (newGrid[r][c]) column.push(newGrid[r][c]);
        }
        for (let r = GRID_ROWS - 1; r >= 0; r--) {
          const block = column[GRID_ROWS - 1 - r] || null;
          newGrid[r][c] = block ? { ...block, row: r, col: c } : null;
        }
      }
      return newGrid;
    });

    setTarget(generateTarget());
    
    if (mode === 'classic') {
      addRow();
    } else {
      setTimeLeft(TIME_LIMIT);
    }
  };

  const resetGame = () => {
    setGrid(createInitialGrid(INITIAL_ROWS));
    setTarget(generateTarget());
    setScore(0);
    setSelectedIds([]);
    setGameOver(false);
    setTimeLeft(TIME_LIMIT);
    setIsPaused(false);
  };

  const toggleMode = () => {
    const newMode = mode === 'classic' ? 'time' : 'classic';
    setMode(newMode);
    resetGame();
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-[420px] aspect-[9/16] bg-white border-[6px] border-[#1A1C2E] rounded-[48px] shadow-2xl overflow-hidden flex flex-col relative">
        
        {/* Header */}
        <div className="px-8 pt-8 pb-4 flex justify-between items-center border-b-[3px] border-[#1A1C2E]">
          <h2 className="text-2xl font-black italic text-[#1A1C2E]">{t.title}</h2>
          <button 
            onClick={() => setLanguage(l => l === 'zh' ? 'en' : 'zh')}
            className="px-4 py-1 border-2 border-[#1A1C2E] rounded-full text-sm font-bold hover:bg-[#1A1C2E] hover:text-white transition-colors"
          >
            {t.lang}
          </button>
        </div>

        {!gameStarted ? (
          /* Start Screen */
          <div className="flex-1 flex flex-col items-center px-8 py-12">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-32 h-32 bg-[#5851DB] rounded-[32px] shadow-lg flex items-center justify-center mb-12 p-4"
            >
              <span className="text-white text-xl font-black tracking-tight text-center leading-tight">AI Xiaoming</span>
            </motion.div>

            <h1 className="text-4xl font-black text-[#1A1C2E] mb-4">{t.title}</h1>
            <p className="text-gray-500 text-center mb-12 font-medium leading-relaxed">
              {t.subtitle}
            </p>

            <div className="w-full space-y-4 mb-auto">
              <button 
                onClick={() => startGame('classic')}
                className="w-full bg-[#5851DB] text-white py-6 rounded-3xl shadow-[0_8px_0_0_#3F39A1] active:translate-y-1 active:shadow-none transition-all flex flex-col items-center"
              >
                <span className="text-2xl font-black">{t.classic}</span>
                <span className="text-[10px] font-bold opacity-60 tracking-widest mt-1">{t.classicSub}</span>
              </button>

              <button 
                onClick={() => startGame('time')}
                className="w-full bg-[#F47C20] text-white py-6 rounded-3xl shadow-[0_8px_0_0_#C46319] active:translate-y-1 active:shadow-none transition-all flex flex-col items-center"
              >
                <span className="text-2xl font-black">{t.time}</span>
                <span className="text-[10px] font-bold opacity-60 tracking-widest mt-1">{t.timeSub}</span>
              </button>
            </div>

            <div className="text-center mt-8">
              <div className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">{t.highScore}</div>
              <div className="text-3xl font-black text-[#1A1C2E]">{highScore.toLocaleString()}</div>
            </div>
          </div>
        ) : (
          /* Game Screen */
          <div className="flex-1 flex flex-col p-6 overflow-hidden">
            {/* HUD */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white border-2 border-[#1A1C2E] p-3 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden">
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{t.target}</div>
                <div className="text-4xl font-black text-[#1A1C2E]">{target}</div>
                <div className="absolute -right-2 -bottom-2 opacity-5">
                  <Zap size={48} />
                </div>
              </div>
              
              <div className="bg-[#1A1C2E] p-3 rounded-2xl flex flex-col items-center justify-center text-white">
                <div className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">{t.score}</div>
                <div className="text-3xl font-black">{score.toLocaleString()}</div>
              </div>
            </div>

            {/* Timer for Time Mode */}
            {mode === 'time' && (
              <div className="mb-6 flex items-center gap-3 px-2">
                <Timer size={16} className={cn(timeLeft <= 3 && "text-red-500 animate-pulse")} />
                <div className="flex-1 bg-gray-200 h-2 rounded-full overflow-hidden">
                  <motion.div 
                    className={cn("h-full bg-[#1A1C2E]", timeLeft <= 3 && "bg-red-500")}
                    initial={false}
                    animate={{ width: `${(timeLeft / TIME_LIMIT) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-black w-4">{timeLeft}</span>
              </div>
            )}

            {/* Grid */}
            <div className="flex-1 flex items-center justify-center">
              <div 
                className="grid gap-1.5 p-1.5 bg-[#1A1C2E] rounded-2xl shadow-xl"
                style={{ 
                  gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
                  width: '100%',
                  aspectRatio: `${GRID_COLS}/${GRID_ROWS}`
                }}
              >
                {grid.map((row, r) => (
                  row.map((block, c) => (
                    <div 
                      key={`${r}-${c}`}
                      className="aspect-square bg-white/5 rounded-md relative"
                    >
                      <AnimatePresence mode="popLayout">
                        {block && (
                          <motion.button
                            layoutId={block.id}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 1.2, opacity: 0 }}
                            onClick={() => handleBlockClick(block)}
                            className={cn(
                              "absolute inset-0 flex items-center justify-center text-lg font-black rounded-md transition-all",
                              selectedIds.includes(block.id) 
                                ? "bg-[#5851DB] text-white z-20 scale-110 shadow-lg" 
                                : "bg-white text-[#1A1C2E] hover:bg-gray-100"
                            )}
                          >
                            {block.value}
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  ))
                ))}
              </div>
            </div>

            {/* Controls */}
            <div className="mt-6 flex gap-3">
              <button 
                onClick={() => setIsPaused(!isPaused)}
                className="flex-1 bg-white border-2 border-[#1A1C2E] py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
              >
                {isPaused ? <Play size={18} /> : <Pause size={18} />}
                {isPaused ? t.resume : t.paused}
              </button>
              <button 
                onClick={backToMenu}
                className="p-4 bg-white border-2 border-[#1A1C2E] rounded-2xl hover:bg-gray-50 transition-colors"
              >
                <RotateCcw size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Overlays */}
        <AnimatePresence>
          {gameOver && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-50 bg-[#1A1C2E]/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
            >
              <AlertCircle size={80} className="text-red-500 mb-6" />
              <h2 className="text-5xl font-black text-white mb-2">{t.gameOver}</h2>
              <p className="text-white/60 font-medium mb-12">{t.gameOverSub}</p>
              
              <div className="w-full max-w-xs space-y-4">
                <div className="bg-white/10 p-6 rounded-3xl mb-8">
                  <div className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">{t.score}</div>
                  <div className="text-5xl font-black text-white">{score.toLocaleString()}</div>
                </div>
                <button 
                  onClick={resetGame}
                  className="w-full bg-white text-[#1A1C2E] py-5 rounded-3xl font-black text-xl shadow-[0_8px_0_0_#D1D5DB] active:translate-y-1 active:shadow-none transition-all"
                >
                  {t.restart}
                </button>
                <button 
                  onClick={backToMenu}
                  className="w-full text-white/60 py-2 font-bold hover:text-white transition-colors"
                >
                  返回主菜单
                </button>
              </div>
            </motion.div>
          )}

          {isPaused && !gameOver && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-40 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center"
            >
              <Play size={80} className="text-[#5851DB] mb-6 animate-pulse" />
              <h2 className="text-5xl font-black text-[#1A1C2E] mb-12">{t.paused}</h2>
              <button 
                onClick={() => setIsPaused(false)}
                className="w-full max-w-xs bg-[#1A1C2E] text-white py-5 rounded-3xl font-black text-xl shadow-[0_8px_0_0_#000000] active:translate-y-1 active:shadow-none transition-all"
              >
                {t.resume}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
