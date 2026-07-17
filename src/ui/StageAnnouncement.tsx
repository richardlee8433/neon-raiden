import { useGameStore } from '../store/gameStore'

export function StageAnnouncement() {
  const stage = useGameStore((s) => s.stage)
  const loop = useGameStore((s) => s.loop)

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,10,0.75)',
      color: '#fff', fontFamily: 'monospace',
      pointerEvents: 'none', userSelect: 'none',
    }}>
      <div style={{ fontSize: 12, letterSpacing: 6, color: '#888', marginBottom: 8 }}>
        NOW ENTERING
      </div>
      <div style={{
        fontSize: 52, fontWeight: 'bold', letterSpacing: 6,
        color: '#00ccff',
        textShadow: '0 0 24px #00ccff, 0 0 60px #0044ff',
      }}>
        STAGE {stage}
      </div>
      <div style={{ marginTop: 16, fontSize: 11, color: '#555', letterSpacing: 3 }}>
        {stage === 2 ? 'NEBULA FIELD' : stage === 3 ? 'ASTEROID BELT' : 'DEEP SPACE'}
      </div>
      {loop > 1 && (
        <div style={{
          marginTop: 22, fontSize: 13, letterSpacing: 4,
          color: '#ff6644', textShadow: '0 0 10px #ff2200',
        }}>
          LOOP {loop} — ENEMY FORCES INTENSIFIED
        </div>
      )}
    </div>
  )
}
