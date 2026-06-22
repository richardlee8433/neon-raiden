export interface EnemyDef {
  sprite: string      // path under /assets/kenney/
  hp: number
  speed: number
  scoreValue: number
  fireRate: number    // seconds between shots (0 = no fire)
  bulletSpeed: number
  scale: number
}

export const ENEMIES: Record<string, EnemyDef> = {
  fighter: {
    sprite: '/assets/kenney/Ships/ship_0001.png',
    hp: 1, speed: 120, scoreValue: 100,
    fireRate: 2.5, bulletSpeed: 220, scale: 1.5,
  },
  bomber: {
    sprite: '/assets/kenney/Ships/ship_0003.png',
    hp: 3, speed: 70, scoreValue: 300,
    fireRate: 1.8, bulletSpeed: 180, scale: 2,
  },
  scout: {
    sprite: '/assets/kenney/Ships/ship_0005.png',
    hp: 1, speed: 200, scoreValue: 150,
    fireRate: 0, bulletSpeed: 0, scale: 1.2,
  },
}
