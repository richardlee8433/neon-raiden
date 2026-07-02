// Stage dimensions, computed once at load.
// Width is fixed at 480 (all formations/balance assume it); height stretches
// to match the device aspect ratio so mobile screens are filled edge to edge.
export const STAGE_W = 480

function computeStageH(): number {
  if (typeof window === 'undefined') return 640
  const aspect = window.innerHeight / window.innerWidth
  return Math.round(Math.min(960, Math.max(640, STAGE_W * aspect)))
}

export const STAGE_H = computeStageH()
