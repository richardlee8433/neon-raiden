import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore'

export function GameOverScreen() {
  const { score, hiScore, setPhase } = useGameStore()
  const [blink, setBlink] = useState(true)

  useEffect(() => {
    const id = setInterval(() => setBlink((b) => !b), 550)
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') setPhase('title')
    }
    window.addEventListener('keydown', onKey)
    return () => { clearInterval(id); window.removeEventListener('keydown', onKey) }
  }, [setPhase])

  return (
    <div
      onPointerDown={() => setPhase('title')}
      style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,10,0.92)',
      color: '#fff', fontFamily: 'monospace',
      userSelect: 'none', cursor: 'pointer', touchAction: 'none',
    }}>
      <div style={{ fontSize: 38, fontWeight: 'bold', color: '#ff2233',
        textShadow: '0 0 16px #ff0000', letterSpacing: 4 }}>
        GAME  OVER
      </div>
      <div style={{ marginTop: 36, fontSize: 13, color: '#aaa', letterSpacing: 2 }}>
        SCORE
      </div>
      <div style={{ fontSize: 28, color: '#ffdd00', marginTop: 6 }}>
        {String(score).padStart(6, '0')}
      </div>
      <div style={{ marginTop: 20, fontSize: 11, color: '#666', letterSpacing: 2 }}>
        HI-SCORE  {String(hiScore).padStart(6, '0')}
      </div>
      <div style={{
        marginTop: 44, fontSize: 13, letterSpacing: 3,
        color: blink ? '#aaaaff' : 'transparent',
        transition: 'color 0.1s',
      }}>
        TAP  OR  PRESS  SPACE  TO  RETRY
      </div>
    </div>
  )
}
