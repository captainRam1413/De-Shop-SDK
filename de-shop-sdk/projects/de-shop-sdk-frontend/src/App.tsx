import { useState } from 'react'
import GameShowcase from './components/GameShowcase'
import TerminalConsole from './components/TerminalConsole'

export default function App() {
  const [mode, setMode] = useState<'game' | 'terminal'>('game')

  return (
    <>
      {/* Mode toggle floating button */}
      <button
        className="mode-toggle"
        onClick={() => setMode(m => m === 'game' ? 'terminal' : 'game')}
        title={mode === 'game' ? 'Switch to Terminal' : 'Switch to Game Demo'}
      >
        {mode === 'game' ? '⌨ Terminal' : '🎮 Game'}
      </button>
      {mode === 'game' ? <GameShowcase /> : <TerminalConsole />}
    </>
  )
}
