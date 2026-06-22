import { useEffect, useRef } from 'react'
import { GameApp } from './game/core/GameApp'
import { HUD } from './ui/HUD'
import { TitleScreen } from './ui/TitleScreen'
import { GameOverScreen } from './ui/GameOverScreen'
import { StageClearScreen } from './ui/StageClearScreen'
import { useGameStore } from './store/gameStore'

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef   = useRef<GameApp | null>(null)
  const phase     = useGameStore((s) => s.phase)

  useEffect(() => {
    if (!canvasRef.current || gameRef.current) return
    const game = new GameApp(canvasRef.current)
    gameRef.current = game
    game.init().catch(console.error)
    return () => {
      game.destroy()
      gameRef.current = null
    }
  }, [])

  return (
    <div style={{ position: 'relative', width: 480, height: 640, margin: '0 auto' }}>
      <canvas ref={canvasRef} width={480} height={640} style={{ display: 'block' }} />
      <HUD />
      {phase === 'title'      && <TitleScreen />}
      {phase === 'gameover'   && <GameOverScreen />}
      {phase === 'stageclear' && <StageClearScreen />}
    </div>
  )
}
