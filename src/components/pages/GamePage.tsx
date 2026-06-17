'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Gamepad2,
  Keyboard,
  Target,
  Cpu,
  Trophy,
  Hash,
  Zap,
  Bot,
  Pickaxe,
  Atom,
  Brain,
  Award,
  RotateCcw,
  Play,
  Pause,
  TrendingUp,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crown,
} from 'lucide-react'
import { useDeShopStore } from '@/store/useDeShopStore'
import { useGameScores, type ScoreGame } from '@/hooks/useGameScores'
import { cn } from '@/lib/utils'

/* ============================================================ */
/* SHARED UI                                                     */
/* ============================================================ */

function TrafficLights() {
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <span className="terminal-dot terminal-dot-red" />
      <span className="terminal-dot terminal-dot-yellow" />
      <span className="terminal-dot terminal-dot-green" />
    </div>
  )
}

interface GameTab {
  id: ScoreGame
  label: string
  command: string
  icon: React.ElementType
}

const GAME_TABS: GameTab[] = [
  { id: 'snake', label: 'SNAKE', command: './snake', icon: Gamepad2 },
  { id: 'typing', label: 'TYPING TEST', command: './typing', icon: Keyboard },
  { id: 'guess', label: 'NUMBER GUESS', command: './guess', icon: Target },
  { id: 'clicker', label: 'HACKER CLICKER', command: './clicker', icon: Cpu },
]

const GAME_LABELS: Record<ScoreGame, string> = {
  snake: 'Snake',
  typing: 'Typing Test',
  guess: 'Number Guess',
  clicker: 'Hacker Clicker',
}

/* ============================================================ */
/* SNAKE GAME                                                    */
/* ============================================================ */

const SNAKE_W = 20
const SNAKE_H = 15

interface Cell {
  x: number
  y: number
}
type SnakeStatus = 'idle' | 'running' | 'paused' | 'over'

function SnakeGame({
  onScore,
  onPlay,
  currentScoreRef,
}: {
  onScore: (score: number) => void
  onPlay: () => void
  currentScoreRef: React.MutableRefObject<number>
}) {
  const START_SNAKE: Cell[] = useMemo(
    () => [
      { x: 10, y: 7 },
      { x: 9, y: 7 },
      { x: 8, y: 7 },
    ],
    []
  )

  const [snake, setSnake] = useState<Cell[]>(START_SNAKE)
  const [food, setFood] = useState<Cell>({ x: 15, y: 7 })
  const [dir, setDir] = useState<Cell>({ x: 1, y: 0 })
  const [status, setStatus] = useState<SnakeStatus>('idle')
  const [score, setScore] = useState(0)

  // Refs so the interval closure can read latest state without rebinding
  const snakeRef = useRef(snake)
  snakeRef.current = snake
  const foodRef = useRef(food)
  foodRef.current = food
  const dirRef = useRef(dir)
  dirRef.current = dir
  const nextDirRef = useRef(dir)

  // Score → parent
  useEffect(() => {
    currentScoreRef.current = score
  }, [score, currentScoreRef])

  // Speed increases every 5 points
  const speed = Math.max(60, 160 - Math.floor(score / 5) * 15)

  const placeFood = useCallback((currentSnake: Cell[]): Cell => {
    let nf: Cell
    let attempts = 0
    do {
      nf = {
        x: Math.floor(Math.random() * SNAKE_W),
        y: Math.floor(Math.random() * SNAKE_H),
      }
      attempts++
      if (attempts > 500) break
    } while (currentSnake.some((c) => c.x === nf.x && c.y === nf.y))
    return nf
  }, [])

  const start = useCallback(
    (initialDir?: Cell) => {
      const d = initialDir ?? { x: 1, y: 0 }
      const fresh: Cell[] = [
        { x: 10, y: 7 },
        { x: 9, y: 7 },
        { x: 8, y: 7 },
      ]
      setSnake(fresh)
      setFood(placeFood(fresh))
      setDir(d)
      nextDirRef.current = d
      dirRef.current = d
      setScore(0)
      currentScoreRef.current = 0
      setStatus('running')
      onPlay()
    },
    [placeFood, onPlay, currentScoreRef]
  )

  // Game loop
  useEffect(() => {
    if (status !== 'running') return
    const interval = setInterval(() => {
      const curSnake = snakeRef.current
      const curDir = nextDirRef.current
      const curFood = foodRef.current
      const head = curSnake[0]
      const newHead = { x: head.x + curDir.x, y: head.y + curDir.y }

      // Wall collision
      if (
        newHead.x < 0 ||
        newHead.x >= SNAKE_W ||
        newHead.y < 0 ||
        newHead.y >= SNAKE_H
      ) {
        setStatus('over')
        return
      }
      // Self collision (ignore tail because it will move out unless we grow)
      const willEat = newHead.x === curFood.x && newHead.y === curFood.y
      const bodyToCheck = willEat ? curSnake : curSnake.slice(0, -1)
      if (bodyToCheck.some((c) => c.x === newHead.x && c.y === newHead.y)) {
        setStatus('over')
        return
      }

      const newSnake = [newHead, ...curSnake]
      if (willEat) {
        setScore((s) => s + 1)
        setFood(placeFood(newSnake))
      } else {
        newSnake.pop()
      }
      setSnake(newSnake)
    }, speed)
    return () => clearInterval(interval)
  }, [status, speed, placeFood])

  // Notify parent of final score on game over
  const reportedRef = useRef(false)
  useEffect(() => {
    if (status === 'over' && !reportedRef.current) {
      reportedRef.current = true
      onScore(score)
    }
    if (status === 'running') {
      reportedRef.current = false
    }
  }, [status, score, onScore])

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()

      const matchDir = (
        key: string
      ): Cell | null => {
        if (key === 'arrowup' || key === 'w') return { x: 0, y: -1 }
        if (key === 'arrowdown' || key === 's') return { x: 0, y: 1 }
        if (key === 'arrowleft' || key === 'a') return { x: -1, y: 0 }
        if (key === 'arrowright' || key === 'd') return { x: 1, y: 0 }
        return null
      }

      if (status === 'idle') {
        const d = matchDir(k)
        if (d) {
          e.preventDefault()
          start(d)
        } else if (k === ' ' || k === 'enter') {
          e.preventDefault()
          start()
        }
        return
      }

      if (status === 'over') {
        if (k === ' ' || k === 'enter') {
          e.preventDefault()
          start()
        }
        return
      }

      if (k === 'p') {
        e.preventDefault()
        setStatus((s) => (s === 'running' ? 'paused' : s === 'paused' ? 'running' : s))
        return
      }

      if (status === 'running') {
        const d = matchDir(k)
        if (d) {
          e.preventDefault()
          const cur = dirRef.current
          // Prevent 180° reversal
          if (cur.x + d.x === 0 && cur.y + d.y === 0) return
          nextDirRef.current = d
          setDir(d)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [status, start])

  // Mobile D-pad
  const setDirMobile = (d: Cell) => {
    if (status === 'idle') {
      start(d)
      return
    }
    if (status === 'over') {
      start()
      return
    }
    if (status === 'running') {
      const cur = dirRef.current
      if (cur.x + d.x === 0 && cur.y + d.y === 0) return
      nextDirRef.current = d
      setDir(d)
    }
  }

  // Build cell grid for rendering
  const cells = []
  for (let y = 0; y < SNAKE_H; y++) {
    for (let x = 0; x < SNAKE_W; x++) {
      const isHead = snake[0].x === x && snake[0].y === y
      const isBody = !isHead && snake.some((c) => c.x === x && c.y === y)
      const isFood = food.x === x && food.y === y
      cells.push(
        <div
          key={`${x}-${y}`}
          className={cn(
            'aspect-square border border-[#1a1a1a]',
            isHead && 'bg-term-green shadow-[0_0_6px_rgba(51,255,51,0.6)]',
            isBody && 'bg-term-green/70',
            isFood && 'bg-term-amber shadow-[0_0_8px_rgba(255,184,0,0.7)] animate-pulse',
            !isHead && !isBody && !isFood && 'bg-[#0d0d0d]'
          )}
        />
      )
    }
  }

  return (
    <div className="space-y-3">
      {/* Status line */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-[11px]">
        <div className="flex items-center gap-3">
          <span className="text-term-dim">
            <span className="prompt-prefix">$</span> ./snake --start
          </span>
          <span className="text-term-green">SCORE: {score}</span>
          <span className="text-term-amber">SPEED: {Math.round((160 - speed) / 15) + 1}x</span>
        </div>
        <div className="flex items-center gap-2">
          {status === 'idle' && (
            <button
              onClick={() => start()}
              className="terminal-btn terminal-btn-primary text-[10px] flex items-center gap-1"
            >
              <Play size={10} /> START
            </button>
          )}
          {status === 'running' && (
            <button
              onClick={() => setStatus('paused')}
              className="terminal-btn text-[10px] flex items-center gap-1"
            >
              <Pause size={10} /> PAUSE
            </button>
          )}
          {status === 'paused' && (
            <button
              onClick={() => setStatus('running')}
              className="terminal-btn terminal-btn-primary text-[10px] flex items-center gap-1"
            >
              <Play size={10} /> RESUME
            </button>
          )}
          <button
            onClick={() => start()}
            className="terminal-btn text-[10px] flex items-center gap-1"
          >
            <RotateCcw size={10} /> RESET
          </button>
        </div>
      </div>

      {/* Grid */}
      <div
        className="relative w-full max-w-md mx-auto bg-[#0d0d0d] border border-term-green/30 p-1"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${SNAKE_W}, 1fr)`,
          gridTemplateRows: `repeat(${SNAKE_H}, 1fr)`,
        }}
      >
        {cells}

        {/* Overlays */}
        <AnimatePresence>
          {status === 'idle' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            >
              <div className="text-center">
                <div className="text-term-green text-sm font-bold glow-green mb-2">
                  ▶ ASCII SNAKE
                </div>
                <div className="text-term-dim text-[10px]">
                  Press <span className="text-term-amber">SPACE</span> or any{' '}
                  <span className="text-term-amber">ARROW</span> to start
                </div>
                <div className="text-term-dim text-[9px] mt-1">
                  WASD also works · P to pause
                </div>
              </div>
            </motion.div>
          )}
          {status === 'paused' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            >
              <div className="text-center">
                <Pause size={24} className="text-term-amber mx-auto mb-1" />
                <div className="text-term-amber text-sm font-bold">PAUSED</div>
                <div className="text-term-dim text-[10px] mt-1">Press P to resume</div>
              </div>
            </motion.div>
          )}
          {status === 'over' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            >
              <div className="text-center">
                <div className="text-term-red text-sm font-bold glow-red mb-2">
                  ✗ GAME OVER
                </div>
                <div className="text-term-text text-[11px] mb-1">
                  Final score: <span className="text-term-green font-bold">{score}</span>
                </div>
                <div className="text-term-dim text-[10px] mt-2">
                  Press <span className="text-term-amber">SPACE</span> to restart
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile D-pad */}
      <div className="grid grid-cols-3 gap-1 max-w-[180px] mx-auto sm:hidden">
        <div />
        <button
          onClick={() => setDirMobile({ x: 0, y: -1 })}
          className="terminal-btn py-2 flex items-center justify-center"
          aria-label="Up"
        >
          <ChevronUp size={16} />
        </button>
        <div />
        <button
          onClick={() => setDirMobile({ x: -1, y: 0 })}
          className="terminal-btn py-2 flex items-center justify-center"
          aria-label="Left"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={() => setDirMobile({ x: 0, y: 1 })}
          className="terminal-btn py-2 flex items-center justify-center"
          aria-label="Down"
        >
          <ChevronDown size={16} />
        </button>
        <button
          onClick={() => setDirMobile({ x: 1, y: 0 })}
          className="terminal-btn py-2 flex items-center justify-center"
          aria-label="Right"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Controls help */}
      <div className="text-[10px] text-term-dim text-center">
        <span className="text-term-green">↑↓←→</span> /{' '}
        <span className="text-term-green">WASD</span> move ·{' '}
        <span className="text-term-amber">P</span> pause ·{' '}
        <span className="text-term-amber">SPACE</span> restart
      </div>
    </div>
  )
}

/* ============================================================ */
/* TYPING SPEED TEST                                             */
/* ============================================================ */

const TYPING_SNIPPETS = [
  'const sdk = new DeShop({ network: "testnet" });',
  'await sdk.mint({ name: "Neon Blade", rarity: "Legendary" });',
  'const assets = await sdk.marketplace.list({ sort: "price" });',
  'sdk.connectWallet("pera").then(addr => console.log(addr));',
  'await sdk.transferAsset(assetId, toAddr).sign();',
] as const

function TypingGame({
  onScore,
  onPlay,
  currentScoreRef,
}: {
  onScore: (wpm: number) => void
  onPlay: () => void
  currentScoreRef: React.MutableRefObject<number>
}) {
  const [snippetIdx, setSnippetIdx] = useState(0)
  const [typed, setTyped] = useState('')
  const [startTime, setStartTime] = useState<number | null>(null)
  const [endTime, setEndTime] = useState<number | null>(null)
  const [correctChars, setCorrectChars] = useState(0)
  const [totalChars, setTotalChars] = useState(0)
  const [errors, setErrors] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const currentSnippet = TYPING_SNIPPETS[snippetIdx]
  const finished = endTime !== null
  const playStartedRef = useRef(false)

  // Live elapsed time (re-render every 200ms while playing)
  const [, forceTick] = useState(0)
  useEffect(() => {
    if (finished || startTime === null) return
    const id = setInterval(() => forceTick((t) => t + 1), 200)
    return () => clearInterval(id)
  }, [finished, startTime])

  const elapsedSec = startTime
    ? ((endTime ?? Date.now()) - startTime) / 1000
    : 0
  const wpm = elapsedSec > 0 ? Math.round((correctChars / 5) / (elapsedSec / 60)) : 0
  const accuracy = totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 100

  useEffect(() => {
    currentScoreRef.current = wpm
  }, [wpm, currentScoreRef])

  // Auto-focus
  useEffect(() => {
    inputRef.current?.focus()
  }, [snippetIdx])

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (finished) return
    const val = e.target.value

    if (startTime === null && !playStartedRef.current) {
      playStartedRef.current = true
      setStartTime(Date.now())
      onPlay()
    }

    // Detect new char added (ignore backspace for stats)
    if (val.length > typed.length) {
      const newCharIdx = val.length - 1
      const expected = currentSnippet[newCharIdx]
      const actual = val[newCharIdx]
      setTotalChars((t) => t + 1)
      if (actual === expected) {
        setCorrectChars((c) => c + 1)
      } else {
        setErrors((err) => err + 1)
      }
    }

    setTyped(val)

    // Check if snippet completed
    if (val === currentSnippet) {
      if (snippetIdx + 1 < TYPING_SNIPPETS.length) {
        setSnippetIdx((i) => i + 1)
        setTyped('')
      } else {
        // Finished all snippets
        const now = Date.now()
        setEndTime(now)
        // The last keystroke was a correct char that hasn't been applied to state yet
        const finalCorrect = correctChars + 1
        const finalTotal = totalChars + 1
        const minutes = (now - (startTime ?? now)) / 60000
        const finalWpm = minutes > 0 ? Math.round((finalCorrect / 5) / minutes) : 0
        currentScoreRef.current = finalWpm
        onScore(finalWpm)
      }
    }
  }

  const restart = () => {
    setSnippetIdx(0)
    setTyped('')
    setStartTime(null)
    setEndTime(null)
    setCorrectChars(0)
    setTotalChars(0)
    setErrors(0)
    playStartedRef.current = false
    currentScoreRef.current = 0
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  // Render snippet chars with coloring
  const renderedSnippet = currentSnippet.split('').map((ch, i) => {
    let cls = 'text-term-dim'
    if (i < typed.length) {
      cls = typed[i] === ch ? 'text-term-green' : 'text-term-red bg-term-red/20'
    } else if (i === typed.length) {
      cls = 'text-term-amber underline bg-term-amber/10'
    }
    const display = ch === ' ' ? '\u00A0' : ch
    return (
      <span key={i} className={cls}>
        {display}
      </span>
    )
  })

  return (
    <div className="space-y-3">
      {/* Status line */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-[11px]">
        <div className="flex items-center gap-3">
          <span className="text-term-dim">
            <span className="prompt-prefix">$</span> ./typing --test
          </span>
          <span className="text-term-cyan">
            SNIPPET {snippetIdx + 1}/{TYPING_SNIPPETS.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-term-green">
            WPM: <span className="font-bold">{wpm}</span>
          </span>
          <span className="text-term-amber">ACC: {accuracy}%</span>
          <span className="text-term-red">ERR: {errors}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1">
        {TYPING_SNIPPETS.map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1',
              i < snippetIdx
                ? 'bg-term-green'
                : i === snippetIdx
                  ? 'bg-term-amber'
                  : 'bg-term-elevated'
            )}
          />
        ))}
      </div>

      {/* Snippet display */}
      <div className="bg-[#0d0d0d] border border-term-green/30 p-4 min-h-[80px]">
        <pre className="font-terminal text-sm whitespace-pre-wrap break-all leading-relaxed">
          {renderedSnippet}
          {!finished && typed.length === 0 && (
            <span className="blink-cursor" style={{ marginLeft: 0 }} />
          )}
        </pre>
      </div>

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={typed}
        onChange={handleInput}
        disabled={finished}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        placeholder={startTime === null ? 'Start typing to begin...' : ''}
        className="terminal-input font-terminal"
      />

      {/* Results */}
      <AnimatePresence>
        {finished && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0d0d0d] border border-term-green/40 p-4 space-y-2"
          >
            <div className="text-term-green text-xs font-bold glow-green flex items-center gap-2">
              <Award size={14} /> RESULTS — typing_test.log
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="bg-term-elevated p-2">
                <div className="text-term-dim text-[9px]">WPM</div>
                <div className="text-term-green font-bold text-base">{wpm}</div>
              </div>
              <div className="bg-term-elevated p-2">
                <div className="text-term-dim text-[9px]">ACCURACY</div>
                <div className="text-term-amber font-bold text-base">{accuracy}%</div>
              </div>
              <div className="bg-term-elevated p-2">
                <div className="text-term-dim text-[9px]">CHARS</div>
                <div className="text-term-cyan font-bold text-base">
                  {correctChars}/{totalChars}
                </div>
              </div>
              <div className="bg-term-elevated p-2">
                <div className="text-term-dim text-[9px]">ERRORS</div>
                <div className="text-term-red font-bold text-base">{errors}</div>
              </div>
            </div>
            <button
              onClick={restart}
              className="terminal-btn terminal-btn-primary text-[10px] flex items-center gap-1 mx-auto"
            >
              <RotateCcw size={10} /> RETRY
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-[10px] text-term-dim text-center">
        Type the code exactly as shown. Backspace allowed. Case-sensitive.
      </div>
    </div>
  )
}

/* ============================================================ */
/* NUMBER GUESS (BINARY SEARCH VISUAL)                          */
/* ============================================================ */

function NumberGuessGame({
  onScore,
  onPlay,
  currentScoreRef,
  scores,
}: {
  onScore: (attempts: number) => void
  onPlay: () => void
  currentScoreRef: React.MutableRefObject<number>
  scores: ReturnType<typeof useGameScores>['scores']
}) {
  const [target, setTarget] = useState(() => Math.floor(Math.random() * 100) + 1)
  const [guess, setGuess] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [history, setHistory] = useState<
    { guess: number; result: 'higher' | 'lower' | 'correct' }[]
  >([])
  const [range, setRange] = useState({ low: 1, high: 100 })
  const [won, setWon] = useState(false)
  const [feedback, setFeedback] = useState<string>('Pick a number 1-100')
  const playStartedRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    currentScoreRef.current = attempts
  }, [attempts, currentScoreRef])

  const submit = useCallback(() => {
    if (won) return
    const g = parseInt(guess, 10)
    if (isNaN(g) || g < 1 || g > 100) {
      setFeedback('Invalid input — must be 1-100')
      return
    }
    if (!playStartedRef.current) {
      playStartedRef.current = true
      onPlay()
    }
    const newAttempts = attempts + 1
    setAttempts(newAttempts)

    let result: 'higher' | 'lower' | 'correct'
    if (g < target) {
      result = 'higher'
      setRange((r) => ({ ...r, low: Math.max(r.low, g + 1) }))
      setFeedback(`HIGHER than ${g}`)
    } else if (g > target) {
      result = 'lower'
      setRange((r) => ({ ...r, high: Math.min(r.high, g - 1) }))
      setFeedback(`LOWER than ${g}`)
    } else {
      result = 'correct'
      setFeedback(`CORRECT! ${g} in ${newAttempts} attempts`)
      setWon(true)
      currentScoreRef.current = newAttempts
      onScore(newAttempts)
    }
    setHistory((h) => [{ guess: g, result }, ...h])
    setGuess('')
  }, [attempts, guess, onPlay, onScore, target, won, currentScoreRef])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      submit()
    }
  }

  const reset = () => {
    setTarget(Math.floor(Math.random() * 100) + 1)
    setGuess('')
    setAttempts(0)
    setHistory([])
    setRange({ low: 1, high: 100 })
    setWon(false)
    setFeedback('Pick a number 1-100')
    playStartedRef.current = false
    currentScoreRef.current = 0
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  // Range bar visualization
  const rangePercent = ((range.high - range.low + 1) / 100) * 100
  const rangeStart = ((range.low - 1) / 100) * 100

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2 text-[11px]">
        <div className="flex items-center gap-3">
          <span className="text-term-dim">
            <span className="prompt-prefix">$</span> ./guess --range 1-100
          </span>
          <span className="text-term-amber">ATTEMPTS: {attempts}</span>
        </div>
        <button onClick={reset} className="terminal-btn text-[10px] flex items-center gap-1">
          <RotateCcw size={10} /> NEW GAME
        </button>
      </div>

      {/* Range visualization */}
      <div className="bg-[#0d0d0d] border border-term-amber/30 p-4 space-y-2">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-term-dim">SEARCH RANGE</span>
          <span className="text-term-amber">
            [{range.low} — {range.high}] · {range.high - range.low + 1} candidates
          </span>
        </div>
        {/* Number line */}
        <div className="relative h-6 bg-term-elevated border border-term">
          {/* Eliminated zones */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-term-red/30 border-r border-term-red/50"
            style={{ width: `${rangeStart}%` }}
            title="eliminated"
          />
          <div
            className="absolute top-0 bottom-0 right-0 bg-term-red/30 border-l border-term-red/50"
            style={{ width: `${100 - rangeStart - rangePercent}%` }}
            title="eliminated"
          />
          {/* Active range */}
          <div
            className="absolute top-0 bottom-0 bg-term-amber/30 border-x border-term-amber"
            style={{ left: `${rangeStart}%`, width: `${rangePercent}%` }}
          />
          {/* Center marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-term-green"
            style={{ left: '50%' }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-term-dim">
          <span>1</span>
          <span>25</span>
          <span>50</span>
          <span>75</span>
          <span>100</span>
        </div>
      </div>

      {/* Feedback */}
      <div
        className={cn(
          'p-3 border text-center font-bold text-sm',
          won
            ? 'border-term-green bg-term-green/10 text-term-green glow-green'
            : feedback.startsWith('HIGHER')
              ? 'border-term-cyan bg-term-cyan/10 text-term-cyan'
              : feedback.startsWith('LOWER')
                ? 'border-term-magenta bg-term-magenta/10 text-term-magenta'
                : 'border-term bg-term-elevated text-term-dim'
        )}
      >
        {won && '✓ '}
        {feedback}
      </div>

      {/* Input row */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="number"
          min={1}
          max={100}
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          onKeyDown={handleKey}
          disabled={won}
          placeholder="enter guess 1-100"
          className="terminal-input font-terminal flex-1"
        />
        <button
          onClick={submit}
          disabled={won}
          className="terminal-btn terminal-btn-primary text-[11px] flex items-center gap-1"
        >
          <Target size={12} /> GUESS
        </button>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="bg-[#0d0d0d] border border-term p-2 max-h-32 overflow-y-auto">
          <div className="text-[9px] text-term-dim mb-1">HISTORY.log</div>
          <div className="space-y-0.5">
            {history.map((h, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] font-terminal">
                <span className="text-term-dim">#{history.length - i}</span>
                <span className="text-term-text">{h.guess}</span>
                <span
                  className={cn(
                    'font-bold',
                    h.result === 'higher'
                      ? 'text-term-cyan'
                      : h.result === 'lower'
                        ? 'text-term-magenta'
                        : 'text-term-green'
                  )}
                >
                  {h.result === 'higher' ? '↑ HIGHER' : h.result === 'lower' ? '↓ LOWER' : '✓ CORRECT'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {scores.guessLeaderboard.length > 0 && (
        <div className="bg-[#0d0d0d] border border-term-amber/30 p-2">
          <div className="text-[9px] text-term-amber mb-1 flex items-center gap-1">
            <Trophy size={9} /> LEADERBOARD — best attempts
          </div>
          <div className="space-y-0.5">
            {scores.guessLeaderboard.map((entry, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-[10px] font-terminal"
              >
                <span className="text-term-dim">
                  #{i + 1}{' '}
                  {i === 0 && <Crown size={9} className="inline text-term-amber" />}
                </span>
                <span className="text-term-green font-bold">{entry.attempts} attempts</span>
                <span className="text-term-dim text-[9px]">
                  {new Date(entry.date).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-[10px] text-term-dim text-center">
        Optimal strategy: binary search — ~7 attempts max for 1-100
      </div>
    </div>
  )
}

/* ============================================================ */
/* HACKER CLICKER (IDLE GAME)                                    */
/* ============================================================ */

interface ClickerUpgrade {
  id: 'botNet' | 'minerRig' | 'quantum' | 'ai'
  name: string
  baseCost: number
  perClick: number
  perSec: number
  icon: React.ElementType
  color: string
  desc: string
}

const UPGRADES: ClickerUpgrade[] = [
  {
    id: 'botNet',
    name: 'Bot Net',
    baseCost: 10,
    perClick: 1,
    perSec: 1,
    icon: Bot,
    color: 'text-term-cyan',
    desc: 'Network of infected toasters mining for you',
  },
  {
    id: 'minerRig',
    name: 'Miner Rig',
    baseCost: 100,
    perClick: 5,
    perSec: 5,
    icon: Pickaxe,
    color: 'text-term-amber',
    desc: 'Dedicated GPU rig running 24/7',
  },
  {
    id: 'quantum',
    name: 'Quantum Computer',
    baseCost: 1000,
    perClick: 50,
    perSec: 50,
    icon: Atom,
    color: 'text-term-magenta',
    desc: 'Exploits superposition to mine in multiple realities',
  },
  {
    id: 'ai',
    name: 'AI Assistant',
    baseCost: 10000,
    perClick: 500,
    perSec: 500,
    icon: Brain,
    color: 'text-term-green',
    desc: 'Self-improving AGI that mines while plotting world domination',
  },
]

interface Achievement {
  id: string
  name: string
  threshold: number
  icon: string
}

const ACHIEVEMENTS: Achievement[] = [
  { id: 'firstHash', name: 'First Hash', threshold: 1, icon: '🌱' },
  { id: 'scriptKiddie', name: 'Script Kiddie', threshold: 100, icon: '👶' },
  { id: 'hacker', name: 'Hacker', threshold: 1000, icon: '💻' },
  { id: 'elite', name: 'Elite Hacker', threshold: 10000, icon: '⚡' },
  { id: 'legend', name: 'Living Legend', threshold: 100000, icon: '👑' },
]

interface ClickerState {
  hashes: number
  perClick: number
  perSec: number
  upgrades: Record<ClickerUpgrade['id'], number>
  totalClicks: number
  lifetimeEarned: number
}

const DEFAULT_CLICKER: ClickerState = {
  hashes: 0,
  perClick: 1,
  perSec: 0,
  upgrades: { botNet: 0, minerRig: 0, quantum: 0, ai: 0 },
  totalClicks: 0,
  lifetimeEarned: 0,
}

const CLICKER_KEY = 'deshop-clicker-state'

function loadClicker(): ClickerState {
  if (typeof window === 'undefined') return DEFAULT_CLICKER
  try {
    const raw = window.localStorage.getItem(CLICKER_KEY)
    if (!raw) return DEFAULT_CLICKER
    const parsed = JSON.parse(raw) as Partial<ClickerState>
    return {
      ...DEFAULT_CLICKER,
      ...parsed,
      upgrades: { ...DEFAULT_CLICKER.upgrades, ...(parsed.upgrades ?? {}) },
    }
  } catch {
    return DEFAULT_CLICKER
  }
}

function getCost(base: number, owned: number): number {
  return Math.floor(base * Math.pow(1.5, owned))
}

function formatHashes(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(2) + 'K'
  return Math.floor(n).toString()
}

function HackerClickerGame({
  onScore,
  currentScoreRef,
}: {
  onScore: (maxHashes: number) => void
  currentScoreRef: React.MutableRefObject<number>
}) {
  const [state, setState] = useState<ClickerState>(DEFAULT_CLICKER)
  const [loaded, setLoaded] = useState(false)
  const [floats, setFloats] = useState<{ id: number; x: number; y: number; value: number }[]>([])
  const [recentLog, setRecentLog] = useState<string[]>([])
  const floatIdRef = useRef(0)
  const maxHashesRef = useRef(0)
  const prevAchievementsCountRef = useRef(0)

  // Derive earned achievements from lifetimeEarned (so they never "un-earn" when spending)
  const earnedAchievements = useMemo(
    () => ACHIEVEMENTS.filter((a) => state.lifetimeEarned >= a.threshold),
    [state.lifetimeEarned]
  )

  // Load from localStorage on mount — client-only state hydration.
  // The setState here is intentional: we must read localStorage after mount
  // to avoid SSR/client hydration mismatch.
  useEffect(() => {
    const loadedState = loadClicker()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(loadedState)
    maxHashesRef.current = loadedState.hashes
    prevAchievementsCountRef.current = ACHIEVEMENTS.filter(
      (a) => loadedState.lifetimeEarned >= a.threshold
    ).length
    setLoaded(true)
  }, [])

  // Persist on change (after initial load)
  useEffect(() => {
    if (!loaded) return
    try {
      window.localStorage.setItem(CLICKER_KEY, JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }, [state, loaded])

  // Auto-mining
  useEffect(() => {
    if (!loaded) return
    const interval = setInterval(() => {
      setState((s) => {
        if (s.perSec === 0) return s
        const inc = s.perSec
        const newHashes = s.hashes + inc
        const newLifetime = s.lifetimeEarned + inc
        if (newHashes > maxHashesRef.current) {
          maxHashesRef.current = newHashes
          currentScoreRef.current = newHashes
          onScore(newHashes)
        }
        return { ...s, hashes: newHashes, lifetimeEarned: newLifetime }
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [loaded, onScore, currentScoreRef])

  // Achievement unlock notifications (side-effect only; achievements are derived)
  useEffect(() => {
    if (!loaded) return
    if (earnedAchievements.length <= prevAchievementsCountRef.current) return
    const newOnes = earnedAchievements.slice(prevAchievementsCountRef.current)
    prevAchievementsCountRef.current = earnedAchievements.length
    if (newOnes.length === 0) return
    setRecentLog((l) =>
      [...newOnes.map((a) => `[ACHIEVEMENT] ${a.icon} ${a.name} unlocked!`), ...l].slice(0, 6)
    )
  }, [earnedAchievements, loaded])

  const click = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = ++floatIdRef.current
    setState((s) => {
      const gain = s.perClick
      const newHashes = s.hashes + gain
      if (newHashes > maxHashesRef.current) {
        maxHashesRef.current = newHashes
        currentScoreRef.current = newHashes
        onScore(newHashes)
      }
      return {
        ...s,
        hashes: newHashes,
        lifetimeEarned: s.lifetimeEarned + gain,
        totalClicks: s.totalClicks + 1,
      }
    })
    setFloats((f) => [
      ...f,
      { id, x, y, value: state.perClick },
    ])
    setTimeout(() => {
      setFloats((f) => f.filter((fl) => fl.id !== id))
    }, 800)
  }

  const buy = (upgrade: ClickerUpgrade) => {
    setState((s) => {
      const owned = s.upgrades[upgrade.id]
      const cost = getCost(upgrade.baseCost, owned)
      if (s.hashes < cost) return s
      setRecentLog((l) =>
        [
          `[BUY] +1 ${upgrade.name} for ${formatHashes(cost)} hashes`,
          ...l,
        ].slice(0, 6)
      )
      return {
        ...s,
        hashes: s.hashes - cost,
        perClick: s.perClick + upgrade.perClick,
        perSec: s.perSec + upgrade.perSec,
        upgrades: { ...s.upgrades, [upgrade.id]: owned + 1 },
      }
    })
  }

  const reset = () => {
    setState(DEFAULT_CLICKER)
    maxHashesRef.current = 0
    prevAchievementsCountRef.current = 0
    currentScoreRef.current = 0
    setRecentLog([])
    try {
      window.localStorage.removeItem(CLICKER_KEY)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2 text-[11px]">
        <div className="flex items-center gap-3">
          <span className="text-term-dim">
            <span className="prompt-prefix">$</span> ./hack --miner
          </span>
          <span className="text-term-cyan">
            {state.perSec > 0 && `+${formatHashes(state.perSec)}/s`}
          </span>
        </div>
        <button onClick={reset} className="terminal-btn text-[10px] flex items-center gap-1">
          <RotateCcw size={10} /> RESET
        </button>
      </div>

      {/* Hash counter */}
      <div className="bg-[#0d0d0d] border border-term-green/40 p-4 text-center relative overflow-hidden">
        <div className="text-[10px] text-term-dim mb-1">HASHES MINED</div>
        <motion.div
          key={Math.floor(state.hashes)}
          initial={{ scale: 1 }}
          animate={{ scale: 1 }}
          className="text-3xl sm:text-4xl font-terminal font-bold text-term-green glow-green-strong"
        >
          {formatHashes(state.hashes)}
        </motion.div>
        <div className="text-[9px] text-term-dim mt-1">
          +{state.perClick}/click · +{state.perSec}/sec · {state.totalClicks} clicks total
        </div>

        {/* HACK button */}
        <button
          onClick={click}
          className="mt-4 terminal-btn terminal-btn-primary text-base font-bold px-8 py-3 relative select-none"
          style={{ touchAction: 'manipulation' }}
        >
          <Zap size={16} className="inline mr-2" />
          HACK
          <span className="ml-2 text-[10px] text-term-amber">+{state.perClick}</span>
          {/* Floating damage indicators */}
          {floats.map((f) => (
            <motion.span
              key={f.id}
              initial={{ opacity: 1, y: 0, x: f.x - 20 }}
              animate={{ opacity: 0, y: -40, x: f.x - 20 }}
              transition={{ duration: 0.8 }}
              className="absolute pointer-events-none text-term-amber font-bold text-sm"
              style={{ left: 0, top: 0 }}
            >
              +{f.value}
            </motion.span>
          ))}
        </button>
      </div>

      {/* Upgrades */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {UPGRADES.map((up) => {
          const owned = state.upgrades[up.id]
          const cost = getCost(up.baseCost, owned)
          const affordable = state.hashes >= cost
          const Icon = up.icon
          return (
            <button
              key={up.id}
              onClick={() => buy(up)}
              disabled={!affordable}
              className={cn(
                'text-left p-2 border transition-all',
                affordable
                  ? 'border-term-green/40 bg-term-elevated hover:border-term-green hover:bg-term-green/5 cursor-pointer'
                  : 'border-term bg-term-elevated opacity-60 cursor-not-allowed'
              )}
            >
              <div className="flex items-center gap-2">
                <Icon size={14} className={up.color} />
                <span className="text-[11px] font-bold text-term-text">{up.name}</span>
                <span className="ml-auto text-[9px] text-term-dim">x{owned}</span>
              </div>
              <div className="text-[9px] text-term-dim mt-0.5 leading-tight">{up.desc}</div>
              <div className="flex items-center justify-between mt-1 text-[10px]">
                <span className="text-term-cyan">+{up.perClick}/click</span>
                <span className="text-term-amber">+{up.perSec}/sec</span>
              </div>
              <div
                className={cn(
                  'text-[10px] font-bold mt-1',
                  affordable ? 'text-term-green' : 'text-term-red'
                )}
              >
                COST: {formatHashes(cost)} hashes
              </div>
            </button>
          )
        })}
      </div>

      {/* Achievements */}
      <div className="bg-[#0d0d0d] border border-term p-2">
        <div className="text-[9px] text-term-amber mb-1 flex items-center gap-1">
          <Award size={9} /> ACHIEVEMENTS
        </div>
        <div className="grid grid-cols-5 gap-1">
          {ACHIEVEMENTS.map((a) => {
            const unlocked = earnedAchievements.some((e) => e.id === a.id)
            return (
              <div
                key={a.id}
                className={cn(
                  'p-1 border text-center',
                  unlocked
                    ? 'border-term-green bg-term-green/10'
                    : 'border-term bg-term-elevated opacity-40'
                )}
                title={`${a.name} — ${a.threshold} lifetime hashes`}
              >
                <div className="text-base">{unlocked ? a.icon : '🔒'}</div>
                <div
                  className={cn(
                    'text-[8px] mt-0.5',
                    unlocked ? 'text-term-green' : 'text-term-dim'
                  )}
                >
                  {a.name}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent activity log */}
      {recentLog.length > 0 && (
        <div className="bg-[#0d0d0d] border border-term p-2 max-h-32 overflow-y-auto">
          <div className="text-[9px] text-term-dim mb-1">ACTIVITY.log</div>
          <div className="space-y-0.5">
            {recentLog.map((line, i) => (
              <div key={i} className="text-[10px] text-term-text font-terminal">
                <span className="text-term-green">›</span> {line}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-[10px] text-term-dim text-center">
        Click HACK to mine · buy upgrades to scale · progress saves automatically
      </div>
    </div>
  )
}

/* ============================================================ */
/* SCORE PANEL                                                   */
/* ============================================================ */

function ScorePanel({
  scores,
  activeGame,
  currentScore,
}: {
  scores: ReturnType<typeof useGameScores>['scores']
  activeGame: ScoreGame
  currentScore: number
}) {
  const highScores: Record<ScoreGame, { value: string; unit: string; best: boolean }> = {
    snake: {
      value: scores.snake.toString(),
      unit: 'food',
      best: scores.snake > 0,
    },
    typing: {
      value: scores.typing.toString(),
      unit: 'WPM',
      best: scores.typing > 0,
    },
    guess: {
      value: scores.guess === 0 ? '—' : scores.guess.toString(),
      unit: 'attempts',
      best: scores.guess > 0,
    },
    clicker: {
      value: formatHashes(scores.clicker),
      unit: 'hashes',
      best: scores.clicker > 0,
    },
  }

  const gamesPlayed = scores.gamesPlayed[activeGame]

  return (
    <div className="space-y-3">
      {/* Current session */}
      <div className="terminal-card">
        <div className="terminal-card-header py-1.5 px-3">
          <TrendingUp size={10} className="text-term-cyan" />
          <span className="terminal-title text-[10px] text-left ml-2">session.log</span>
        </div>
        <div className="terminal-card-body p-3 space-y-2">
          <div>
            <div className="text-[9px] text-term-dim">CURRENT GAME</div>
            <div className="text-term-green text-xs font-bold">
              {GAME_LABELS[activeGame]}
            </div>
          </div>
          <div>
            <div className="text-[9px] text-term-dim">CURRENT SCORE</div>
            <div className="text-term-amber text-lg font-bold font-terminal glow-amber">
              {activeGame === 'clicker' ? formatHashes(currentScore) : currentScore}
            </div>
          </div>
          <div>
            <div className="text-[9px] text-term-dim">GAMES PLAYED</div>
            <div className="text-term-cyan text-xs font-bold">
              {gamesPlayed} session{gamesPlayed !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      {/* High scores */}
      <div className="terminal-card">
        <div className="terminal-card-header py-1.5 px-3">
          <Trophy size={10} className="text-term-amber" />
          <span className="terminal-title text-[10px] text-left ml-2">high_scores.log</span>
        </div>
        <div className="terminal-card-body p-2 space-y-1.5">
          {(Object.keys(highScores) as ScoreGame[]).map((g) => {
            const hs = highScores[g]
            const isActive = g === activeGame
            return (
              <div
                key={g}
                className={cn(
                  'flex items-center justify-between px-2 py-1 border text-[10px]',
                  isActive
                    ? 'border-term-green/50 bg-term-green/5'
                    : 'border-term'
                )}
              >
                <span className="flex items-center gap-1">
                  {isActive && <span className="text-term-green">›</span>}
                  <span className={isActive ? 'text-term-green' : 'text-term-dim'}>
                    {GAME_LABELS[g]}
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  {hs.best && <Crown size={9} className="text-term-amber" />}
                  <span
                    className={cn(
                      'font-bold',
                      hs.best ? 'text-term-amber' : 'text-term-dim'
                    )}
                  >
                    {hs.value}
                  </span>
                  <span className="text-term-dim text-[9px]">{hs.unit}</span>
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Total games played */}
      <div className="terminal-card">
        <div className="terminal-card-header py-1.5 px-3">
          <Hash size={10} className="text-term-magenta" />
          <span className="terminal-title text-[10px] text-left ml-2">stats.json</span>
        </div>
        <div className="terminal-card-body p-3">
          <div className="text-[9px] text-term-dim mb-1">TOTAL GAMES PLAYED</div>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(scores.gamesPlayed) as ScoreGame[]).map((g) => (
              <div key={g} className="bg-term-elevated p-1.5 text-center">
                <div className="text-term-green text-base font-bold">
                  {scores.gamesPlayed[g]}
                </div>
                <div className="text-[8px] text-term-dim uppercase">
                  {GAME_LABELS[g]}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-term text-[10px] text-term-dim flex justify-between">
            <span>TOTAL</span>
            <span className="text-term-cyan font-bold">
              {(Object.values(scores.gamesPlayed) as number[]).reduce((a, b) => a + b, 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ============================================================ */
/* MAIN GAME PAGE                                                */
/* ============================================================ */

export default function GamePage() {
  const [activeGame, setActiveGame] = useState<ScoreGame>('snake')
  const [currentScore, setCurrentScore] = useState(0)
  const currentScoreRef = useRef(0)
  const addNotification = useDeShopStore((s) => s.addNotification)

  const handleNewHigh = useCallback(
    (game: ScoreGame, score: number, label: string) => {
      // Clicker high score updates continuously as hashes accumulate —
      // firing a toast every tick would be spammy. Achievement unlocks
      // are already surfaced via the in-game activity log.
      if (game === 'clicker') return
      addNotification(
        'success',
        `🏆 New high score in ${GAME_LABELS[game]}: ${label}`
      )
    },
    [addNotification]
  )

  const { scores, submitScore, incrementGamesPlayed } = useGameScores(handleNewHigh)

  // Sync ref → state for re-render of ScorePanel
  useEffect(() => {
    const id = setInterval(() => {
      if (currentScoreRef.current !== currentScore) {
        setCurrentScore(currentScoreRef.current)
      }
    }, 200)
    return () => clearInterval(id)
  }, [currentScore])

  const handleScore = useCallback(
    (game: ScoreGame) => (score: number) => {
      submitScore(game, score)
    },
    [submitScore]
  )

  const handlePlay = useCallback(
    (game: ScoreGame) => () => {
      incrementGamesPlayed(game)
    },
    [incrementGamesPlayed]
  )

  // Reset current score when switching games
  const switchGame = (g: ScoreGame) => {
    if (g === activeGame) return
    currentScoreRef.current = 0
    setCurrentScore(0)
    setActiveGame(g)
  }

  return (
    <div className="space-y-4">
      {/* Header card with chrome */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="terminal-card terminal-card-glow"
      >
        <div className="terminal-card-header moving-scanline">
          <TrafficLights />
          <span className="terminal-title text-left ml-2">
            game@de-shop:~/arcade
          </span>
          <span className="text-[9px] text-term-dim hidden sm:inline">
            {'// 4 games loaded'}
          </span>
        </div>
        <div className="terminal-card-body p-3 sm:p-4 space-y-3">
          {/* Title row */}
          <div className="flex items-center gap-2 text-xs">
            <Gamepad2 size={14} className="text-term-green glow-green" />
            <span className="text-term-green font-bold">ARCADE</span>
            <span className="text-term-dim">— select a game to play</span>
          </div>

          {/* Game selector tabs */}
          <div className="flex flex-wrap gap-1">
            {GAME_TABS.map((tab) => {
              const isActive = activeGame === tab.id
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => switchGame(tab.id)}
                  className={cn(
                    'terminal-btn text-[10px] flex items-center gap-1.5',
                    isActive && 'terminal-btn-primary'
                  )}
                >
                  <Icon size={11} />
                  <span>[{tab.label}]</span>
                </button>
              )
            })}
          </div>

          {/* Game area + score panel */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-4">
            {/* Game card */}
            <div className="terminal-card">
              <div className="terminal-card-header py-1.5 px-3">
                <span className="w-2 h-2 rounded-full bg-term-green flex-shrink-0" />
                <span className="terminal-title text-[10px] text-left ml-2">
                  {GAME_TABS.find((t) => t.id === activeGame)?.command} --interactive
                </span>
              </div>
              <div className="terminal-card-body p-3 sm:p-4 bg-[#1E1E1E]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeGame}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                  >
                    {activeGame === 'snake' && (
                      <SnakeGame
                        onScore={handleScore('snake')}
                        onPlay={handlePlay('snake')}
                        currentScoreRef={currentScoreRef}
                      />
                    )}
                    {activeGame === 'typing' && (
                      <TypingGame
                        onScore={handleScore('typing')}
                        onPlay={handlePlay('typing')}
                        currentScoreRef={currentScoreRef}
                      />
                    )}
                    {activeGame === 'guess' && (
                      <NumberGuessGame
                        onScore={handleScore('guess')}
                        onPlay={handlePlay('guess')}
                        currentScoreRef={currentScoreRef}
                        scores={scores}
                      />
                    )}
                    {activeGame === 'clicker' && (
                      <HackerClickerGame
                        onScore={handleScore('clicker')}
                        currentScoreRef={currentScoreRef}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Score panel */}
            <ScorePanel
              scores={scores}
              activeGame={activeGame}
              currentScore={currentScore}
            />
          </div>
        </div>
      </motion.div>

      {/* Quick info card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.1 }}
        className="terminal-card terminal-card-glow"
      >
        <div className="terminal-card-header py-1.5 px-3">
          <span className="terminal-title text-[10px] text-left ml-2">readme.txt</span>
        </div>
        <div className="terminal-card-body p-3 text-[10px] text-term-dim space-y-1">
          <div>
            <span className="prompt-prefix">$</span>{' '}
            <span className="text-term-text">cat readme.txt</span>
          </div>
          <div>
            <span className="text-term-green">›</span> All games persist high scores to{' '}
            <span className="text-term-amber">localStorage</span> with key{' '}
            <span className="text-term-cyan">deshop-game-scores</span>.
          </div>
          <div>
            <span className="text-term-green">›</span> Hacker Clicker progress is auto-saved
            under <span className="text-term-cyan">deshop-clicker-state</span>.
          </div>
          <div>
            <span className="text-term-green">›</span> New high scores trigger a notification
            toast in the top-right.
          </div>
        </div>
      </motion.div>
    </div>
  )
}
