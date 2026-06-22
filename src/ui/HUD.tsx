import { useGameStore } from '../store/gameStore'

export function HUD() {
  const { score, hiScore, lives, bombs, power, bossActive, bossHp, bossMaxHp } = useGameStore()

  return (
    <>
      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100%',
        padding: '5px 10px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        color: '#fff', fontFamily: 'monospace', fontSize: 13,
        pointerEvents: 'none', userSelect: 'none',
        textShadow: '0 0 4px #000',
      }}>
        <span>SCORE {String(score).padStart(6, '0')}</span>
        <span>HI {String(hiScore).padStart(6, '0')}</span>
        <span>{'♥'.repeat(Math.max(0, lives))}{'  '}{'💣'.repeat(Math.max(0, bombs))}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          PWR
          <span style={{
            display: 'inline-block', width: 60, height: 8,
            background: '#333', borderRadius: 4, overflow: 'hidden',
          }}>
            <span style={{
              display: 'block', height: '100%',
              width: `${(power / 5) * 100}%`,
              background: '#0f0', transition: 'width 0.2s',
            }} />
          </span>
        </span>
      </div>

      {/* Boss HP bar */}
      {bossActive && (
        <div style={{
          position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          width: 240, pointerEvents: 'none', userSelect: 'none',
          fontFamily: 'monospace', color: '#fff', fontSize: 10,
          textAlign: 'center',
        }}>
          <div style={{ marginBottom: 3, letterSpacing: 2, color: '#ff8888' }}>BOSS</div>
          <div style={{
            width: '100%', height: 10, background: '#333',
            borderRadius: 5, overflow: 'hidden',
            boxShadow: '0 0 6px #ff0000',
          }}>
            <div style={{
              height: '100%',
              width: `${(bossHp / bossMaxHp) * 100}%`,
              background: bossHp / bossMaxHp > 0.5
                ? '#00dd44' : bossHp / bossMaxHp > 0.25 ? '#ffaa00' : '#ff2222',
              transition: 'width 0.1s, background 0.3s',
            }} />
          </div>
        </div>
      )}
    </>
  )
}
