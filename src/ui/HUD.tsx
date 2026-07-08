import { useGameStore } from '../store/gameStore'

const IS_TOUCH = typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0)

function triggerBomb() {
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyX', bubbles: true }))
  setTimeout(() => {
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyX', bubbles: true }))
  }, 120)
}

export function HUD() {
  const { score, hiScore, graze, lives, bombs, power, laserPower,
          bossActive, bossHp, bossMaxHp, bossWarning,
          soundEnabled, toggleSound } = useGameStore()

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
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            BLT
            <span style={{
              display: 'inline-block', width: 40, height: 6,
              background: '#333', borderRadius: 3, overflow: 'hidden',
            }}>
              <span style={{
                display: 'block', height: '100%',
                width: `${(power / 4) * 100}%`,
                background: '#ffee00', transition: 'width 0.2s',
              }} />
            </span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            LZR
            <span style={{
              display: 'inline-block', width: 40, height: 6,
              background: '#333', borderRadius: 3, overflow: 'hidden',
            }}>
              <span style={{
                display: 'block', height: '100%',
                width: `${(laserPower / 5) * 100}%`,
                background: laserPower > 0 ? '#44ddff' : '#333',
                transition: 'width 0.2s',
                boxShadow: laserPower > 0 ? '0 0 4px #44ddff' : 'none',
              }} />
            </span>
          </span>
        </span>

        {/* Sound toggle — needs pointer-events re-enabled */}
        <button
          // Blur after click so a focused button doesn't get re-triggered
          // by the spacebar (which is the fire key).
          onClick={(e) => { toggleSound(); e.currentTarget.blur() }}
          onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') e.preventDefault() }}
          title="Toggle sound (M)"
          style={{
            pointerEvents: 'all',
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid #444',
            borderRadius: 4,
            color: '#fff',
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontSize: 13,
            lineHeight: 1,
            padding: '2px 6px',
            userSelect: 'none',
          }}
        >
          {soundEnabled ? '🔊' : '🔇'}
        </button>
      </div>

      {/* Graze counter */}
      <div style={{
        position: 'absolute', top: 28, left: 10,
        color: '#cc88ff', fontFamily: 'monospace', fontSize: 11,
        pointerEvents: 'none', userSelect: 'none',
        textShadow: '0 0 4px #000',
      }}>
        GRAZE {graze}
      </div>

      {/* Touch bomb button */}
      {IS_TOUCH && (
        <button
          onPointerDown={(e) => { e.stopPropagation(); triggerBomb() }}
          style={{
            position: 'absolute', bottom: 18, right: 14,
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(255,60,30,0.30)',
            border: '2px solid rgba(255,120,80,0.7)',
            color: '#fff', fontSize: 26,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            userSelect: 'none', touchAction: 'none',
            zIndex: 10,
          }}
        >
          💣
        </button>
      )}

      {/* Boss warning banner */}
      {bossWarning && (
        <div style={{
          position: 'absolute', top: '38%', left: 0, width: '100%',
          textAlign: 'center', pointerEvents: 'none', userSelect: 'none',
          fontFamily: 'monospace',
        }}>
          <style>{`
            @keyframes warnFlash {
              0%, 100% { opacity: 1; text-shadow: 0 0 24px #ff2200, 0 0 60px #ff2200; }
              50%      { opacity: 0.25; text-shadow: 0 0 8px #ff2200; }
            }
            @keyframes warnSlide {
              from { transform: translateX(-18px); }
              to   { transform: translateX(18px); }
            }
          `}</style>
          <div style={{
            fontSize: 44, fontWeight: 'bold', letterSpacing: 14,
            color: '#ff3322',
            animation: 'warnFlash 0.45s linear infinite',
          }}>
            WARNING
          </div>
          <div style={{
            marginTop: 6, fontSize: 12, letterSpacing: 6, color: '#ff8877',
            animation: 'warnFlash 0.45s linear infinite, warnSlide 0.9s ease-in-out infinite alternate',
          }}>
            A HUGE BATTLESHIP IS APPROACHING
          </div>
        </div>
      )}

      {/* Boss HP bar */}
      {bossActive && (
        <div style={{
          position: 'absolute', bottom: 16, left: '50%',
          transform: 'translateX(-50%)',
          width: 240,
          pointerEvents: 'none', userSelect: 'none',
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
              background: bossHp / bossMaxHp > 0.5 ? '#00dd44'
                        : bossHp / bossMaxHp > 0.25 ? '#ffaa00' : '#ff2222',
              transition: 'width 0.1s, background 0.3s',
            }} />
          </div>
        </div>
      )}
    </>
  )
}
