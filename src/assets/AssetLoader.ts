import { Texture } from 'pixi.js'

export interface GameAssets {
  playerShip: Texture
  playerBullet: Texture
  enemyBullet: Texture
  bossBullet: Texture
  bossShip: Texture
  pickupPower: Texture
  pickupBomb: Texture
  explosionFrames: Texture[]
}

const EXPLOSION_TILES = [16, 17, 18, 19, 20, 21]

// Load via HTMLImageElement instead of Pixi's Assets.load(), which uses a
// blob-URL worker (null origin) that gets 403'd by VIVERSE's CDN.
function loadTexture(src: string): Promise<Texture> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(Texture.from(img))
    img.onerror = () => reject(new Error(`Failed to load: ${src}`))
    img.src = src
  })
}

export async function loadAssets(): Promise<GameAssets> {
  const paths = [
    './assets/kenney/Ships/ship_0000.png',   // player
    './assets/kenney/Tiles/tile_0000.png',   // player bullet
    './assets/kenney/Tiles/tile_0008.png',   // enemy bullet
    './assets/kenney/Tiles/tile_0010.png',   // boss bullet (larger)
    './assets/kenney/Ships/ship_0015.png',   // boss ship
    './assets/kenney/Tiles/tile_0024.png',   // pickup power
    './assets/kenney/Tiles/tile_0025.png',   // pickup bomb
    ...EXPLOSION_TILES.map((i) =>
      `./assets/kenney/Tiles/tile_${String(i).padStart(4, '0')}.png`,
    ),
  ]

  const textures = await Promise.all(paths.map(loadTexture))

  return {
    playerShip:      textures[0],
    playerBullet:    textures[1],
    enemyBullet:     textures[2],
    bossBullet:      textures[3],
    bossShip:        textures[4],
    pickupPower:     textures[5],
    pickupBomb:      textures[6],
    explosionFrames: textures.slice(7),
  }
}
