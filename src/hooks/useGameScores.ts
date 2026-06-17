'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

const SCORES_KEY = 'deshop-game-scores'

export type ScoreGame = 'snake' | 'typing' | 'guess' | 'clicker'

export interface GuessLeaderEntry {
  attempts: number
  date: string
}

export interface GameScores {
  snake: number
  typing: number
  guess: number
  clicker: number
  gamesPlayed: Record<ScoreGame, number>
  guessLeaderboard: GuessLeaderEntry[]
}

const DEFAULT_SCORES: GameScores = {
  snake: 0,
  typing: 0,
  guess: 0,
  clicker: 0,
  gamesPlayed: { snake: 0, typing: 0, guess: 0, clicker: 0 },
  guessLeaderboard: [],
}

function loadScores(): GameScores {
  if (typeof window === 'undefined') return DEFAULT_SCORES
  try {
    const raw = window.localStorage.getItem(SCORES_KEY)
    if (!raw) return DEFAULT_SCORES
    const parsed = JSON.parse(raw) as Partial<GameScores>
    return {
      ...DEFAULT_SCORES,
      ...parsed,
      gamesPlayed: { ...DEFAULT_SCORES.gamesPlayed, ...(parsed.gamesPlayed ?? {}) },
      guessLeaderboard: Array.isArray(parsed.guessLeaderboard)
        ? parsed.guessLeaderboard.slice(0, 5)
        : [],
    }
  } catch {
    return DEFAULT_SCORES
  }
}

function persistScores(scores: GameScores) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SCORES_KEY, JSON.stringify(scores))
  } catch {
    /* ignore */
  }
}

/**
 * Hook that manages persistent game high scores.
 *
 * @param onNewHigh optional callback fired when a new high score is achieved
 *   (game id, score value, friendly label). Use this to trigger UI toasts.
 */
export function useGameScores(
  onNewHigh?: (game: ScoreGame, score: number, label: string) => void
) {
  const [scores, setScores] = useState<GameScores>(DEFAULT_SCORES)
  const [loaded, setLoaded] = useState(false)
  const onNewHighRef = useRef(onNewHigh)

  useEffect(() => {
    onNewHighRef.current = onNewHigh
  }, [onNewHigh])

  useEffect(() => {
    // Client-only localStorage hydration — setState here is intentional
    // to avoid SSR/client hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScores(loadScores())
    setLoaded(true)
  }, [])

  const submitScore = useCallback(
    (game: ScoreGame, score: number) => {
      setScores((prev) => {
        let isHigh = false
        let next: GameScores = { ...prev }

        if (game === 'guess') {
          // Lower is better. 0 means "not yet played".
          if (prev.guess === 0 || score < prev.guess) {
            next.guess = score
            isHigh = true
          }
          // Always record attempt on the leaderboard (top 5, lowest first)
          const entry: GuessLeaderEntry = {
            attempts: score,
            date: new Date().toISOString(),
          }
          const leaderboard = [entry, ...prev.guessLeaderboard]
            .sort((a, b) => a.attempts - b.attempts)
            .slice(0, 5)
          next.guessLeaderboard = leaderboard
        } else if (game === 'clicker') {
          // Highest hash count reached — only update if greater
          if (score > prev.clicker) {
            next.clicker = score
            isHigh = true
          }
        } else {
          // snake, typing — higher is better
          if (score > prev[game]) {
            next[game] = score
            isHigh = true
          }
        }

        if (isHigh) {
          persistScores(next)
          const label =
            game === 'snake'
              ? `${score} food eaten`
              : game === 'typing'
                ? `${score} WPM`
                : game === 'guess'
                  ? `${score} attempts`
                  : `${score.toLocaleString()} hashes`
          onNewHighRef.current?.(game, score, label)
        }
        // Always persist so leaderboard/gamesPlayed updates are saved
        persistScores(next)
        return next
      })
    },
    []
  )

  const incrementGamesPlayed = useCallback((game: ScoreGame) => {
    setScores((prev) => {
      const next: GameScores = {
        ...prev,
        gamesPlayed: {
          ...prev.gamesPlayed,
          [game]: prev.gamesPlayed[game] + 1,
        },
      }
      persistScores(next)
      return next
    })
  }, [])

  const resetScores = useCallback(() => {
    persistScores(DEFAULT_SCORES)
    setScores(DEFAULT_SCORES)
  }, [])

  return { scores, submitScore, incrementGamesPlayed, resetScores, loaded }
}
