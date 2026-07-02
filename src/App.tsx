import { useEffect, useRef, useState } from 'react'
import { GameApp } from './game/core/GameApp'
import { HUD } from './ui/HUD'
import { TitleScreen } from './ui/TitleScreen'
import { GameOverScreen } from './ui/GameOverScreen'
import { StageClearScreen } from './ui/StageClearScreen'
import { StageAnnouncement } from './ui/StageAnnouncement'
import { useGameStore } from './store/gameStore'

import { STAGE_W as GAME_W, STAGE_H as GAME_H } from './game/config'

export default function App() {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const gameRef      = useRef<GameApp | null>(null)
  const phase        = useGameStore((s) => s.phase)
  const toggleSound  = useGameStore((s) => s.toggleSound)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    if (!canvasRef.current || gameRef.current) return
    const game = new GameApp(canvasRef.current)
    gameRef.current = game
    game.init().catch(console.error)
    return () => { game.destroy(); gameRef.current = null }
  }, [])

  // Fit the game to the viewport (mobile support)
  useEffect(() => {
    const onResize = () => {
      const s = Math.min(window.innerWidth / GAME_W, window.innerHeight / GAME_H, 1)
      setScale(s)
      gameRef.current?.setCanvasScale(s)
    }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // 'M' key toggles mute globally
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.code === 'KeyM') toggleSound() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleSound])

  return (
    <div style={{
      position: 'relative', width: GAME_W, height: GAME_H,
      margin: '0 auto',
      transform: `scale(${scale})`,
      transformOrigin: 'top center',
      touchAction: 'none',
    }}>
      <canvas ref={canvasRef} width={GAME_W} height={GAME_H} style={{ display: 'block', touchAction: 'none' }} />
      <HUD />
      {phase === 'title'      && <TitleScreen />}
      {phase === 'gameover'   && <GameOverScreen />}
      {phase === 'stageclear' && <StageClearScreen />}
      {phase === 'advancing'  && <StageAnnouncement />}
    </div>
  )
}
