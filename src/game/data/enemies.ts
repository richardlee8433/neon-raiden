export interface EnemyDef {
  sprite: string
  hp: number
  speed: number
  scoreValue: number
  fireRate: number
  bulletSpeed: number
  scale: number
  usesLaser?: boolean
  attackType?: 'straight' | 'aimed' | 'spread' | 'ring' | 'spiral' | 'aimed-fan'
  spreadCount?: number
  bulletCount?: number  // ring: bullets per volley / spiral: arms / aimed-fan: fan size
}

export const ENEMIES: Record<string, EnemyDef> = {
  // ── Stage 1 ───────────────────────────────────────────────
  fighter: {
    sprite: './assets/kenney/Ships/ship_0001.png',
    hp: 1, speed: 120, scoreValue: 100,
    fireRate: 1.4, bulletSpeed: 230, scale: 1.5,
  },
  bomber: {
    sprite: './assets/kenney/Ships/ship_0003.png',
    hp: 3, speed: 70, scoreValue: 300,
    fireRate: 1.4, bulletSpeed: 170, scale: 2,
    attackType: 'ring', bulletCount: 8,
  },
  scout: {
    sprite: './assets/kenney/Ships/ship_0005.png',
    hp: 1, speed: 200, scoreValue: 150,
    fireRate: 2.0, bulletSpeed: 210, scale: 1.2,
  },
  // ── Stage 2 ───────────────────────────────────────────────
  interceptor: {
    sprite: './assets/kenney/Ships/ship_0007.png',
    hp: 1, speed: 240, scoreValue: 180,
    fireRate: 1.2, bulletSpeed: 300, scale: 1.4,
    attackType: 'aimed',
  },
  gunship: {
    sprite: './assets/kenney/Ships/ship_0009.png',
    hp: 4, speed: 80, scoreValue: 350,
    fireRate: 0, bulletSpeed: 0, scale: 2.2,
    usesLaser: true,
  },
  // ── Stage 3 ───────────────────────────────────────────────
  elite: {
    sprite: './assets/kenney/Ships/ship_0011.png',
    hp: 2, speed: 200, scoreValue: 250,
    fireRate: 0.9, bulletSpeed: 280, scale: 1.6,
    attackType: 'aimed-fan', bulletCount: 3,
  },
  carrier: {
    sprite: './assets/kenney/Ships/ship_0013.png',
    hp: 6, speed: 55, scoreValue: 500,
    fireRate: 0.3, bulletSpeed: 150, scale: 2.5,
    attackType: 'spiral', bulletCount: 2,
  },
}
