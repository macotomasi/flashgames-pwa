import React from 'react'

interface ArcadeHeaderProps {
  record?: number
  streak?: number
}

export default function ArcadeHeader({ record, streak }: ArcadeHeaderProps) {
  return (
    <header
      className="w-full flex items-center justify-between px-4 py-3 border-b-4"
      style={{
        background: 'linear-gradient(90deg, #0a0a23 60%, #1a1a40 100%)',
        borderColor: '#00fff7',
        boxShadow: '0 0 16px #00fff7',
        zIndex: 1000
      }}
    >
      <div className="flex items-center gap-3">
        <span className="text-3xl md:text-4xl" style={{textShadow: '0 0 8px #00fff7'}} role="img" aria-label="arcade">🎮</span>
        <span className="text-2xl md:text-3xl font-mono font-bold text-white" style={{textShadow: '0 0 8px #00fff7, 0 0 2px #fff'}}>
          FlashGames
        </span>
      </div>
      <div className="flex items-center gap-6 text-lg font-mono">
        {typeof record === 'number' && (
          <span className="flex items-center gap-1 text-neon-cyan">
            <span role="img" aria-label="trophy">🏆</span> Record: <span className="font-bold">{record}</span>
          </span>
        )}
        {typeof streak === 'number' && (
          <span className="flex items-center gap-1 text-neon-pink">
            <span role="img" aria-label="fire">🔥</span> Jour <span className="font-bold">{streak}</span>
          </span>
        )}
      </div>
    </header>
  )
} 