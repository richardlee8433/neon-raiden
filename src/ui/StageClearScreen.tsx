import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore'

export function StageClearScreen() {
  const { score, hiScore, setPhase } = useGameStore()
  const [blink, setBlink] = useState(true)

  useEffect(() => {
    const id = setInterval(() => setBlink((b) => !b), 500)
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') setPhase('title')
    }
    window.addEventListener('keydown', onKey)
    return () => { clearInterval(id); window.removeEventListener('keydown', onKey) }
  }, [setPhase])

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,10,0.88)',
      color: '#fff', fontFamily: 'monospace',
      userSelect: 'none',
    }}>
      <div style={{ fontSize: 34, fontWeight: 'bold', color: '#00ffaa',
        textShadow: '0 0 20px #00ffaa', letterSpacing: 4 }}>
        STAGE  CLEAR
      </div>
      <div style={{ marginTop: 36, fontSize: 13, color: '#aaa', letterSpacing: 2 }}>SCORE</div>
      <div style={{ fontSize: 28, color: '#ffdd00', marginTop: 6 }}>
        {String(score).padStart(6, '0')}
      </div>
      <div style={{ marginTop: 20, fontSize: 11, color: '#666', letterSpacing: 2 }}>
        HI-SCORE  {String(hiScore).padStart(6, '0')}
      </div>
      <div style={{
        marginTop: 44, fontSize: 13, letterSpacing: 3,
        color: blink ? '#ffff88' : 'transparent',
      }}>
        PRESS  SPACE  TO  CONTINUE
      </div>
    </div>
  )
}
