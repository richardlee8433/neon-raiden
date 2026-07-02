import { BulletPool } from '../entities/BulletPool'

// Polar-coordinate danmaku emitters. Angles in radians, screen coords:
// 0 points right, PI/2 points down.
//
// A spiral is just a ring with few bullets whose angleOffset advances a
// fixed step per volley — the shooter owns and advances that angle.

/** Evenly spaced bullets around a full circle. */
export function fireRing(
  pool: BulletPool,
  x: number, y: number,
  speed: number, count: number, angleOffset = 0,
) {
  for (let i = 0; i < count; i++) {
    const a = angleOffset + (i * Math.PI * 2) / count
    pool.acquire(x, y, Math.cos(a) * speed, Math.sin(a) * speed)
  }
}

/**
 * Ring whose bullet speeds are modulated by sin(petals·θ): the varying
 * radii trace a flower outline as the volley expands.
 */
export function fireFlower(
  pool: BulletPool,
  x: number, y: number,
  speed: number, count: number, petals: number, angleOffset = 0,
) {
  for (let i = 0; i < count; i++) {
    const a = angleOffset + (i * Math.PI * 2) / count
    const mod = 0.55 + 0.45 * Math.abs(Math.sin((petals * a) / 2))
    pool.acquire(x, y, Math.cos(a) * speed * mod, Math.sin(a) * speed * mod)
  }
}

/** Fan of bullets centered on the direction toward the target. */
export function fireAimedFan(
  pool: BulletPool,
  x: number, y: number,
  speed: number, count: number, spread: number,
  targetX: number, targetY: number,
) {
  const center = Math.atan2(targetY - y, targetX - x)
  const step = count > 1 ? spread / (count - 1) : 0
  const start = center - spread / 2
  for (let i = 0; i < count; i++) {
    const a = start + i * step
    pool.acquire(x, y, Math.cos(a) * speed, Math.sin(a) * speed)
  }
}
