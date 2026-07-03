import { Graphics, Renderer, Texture } from 'pixi.js'

/**
 * Round glowing bullet: white-hot core with layered halo in the given
 * neon color, so enemy fire reads clearly against the dark background.
 */
export function makeGlowBulletTexture(
  renderer: Renderer,
  color: number,
  radius: number,
): Texture {
  const g = new Graphics()
  g.circle(0, 0, radius * 2.4).fill({ color, alpha: 0.12 })
  g.circle(0, 0, radius * 1.7).fill({ color, alpha: 0.28 })
  g.circle(0, 0, radius * 1.2).fill({ color, alpha: 0.75 })
  g.circle(0, 0, radius * 0.65).fill(0xffffff)
  const tex = renderer.generateTexture({ target: g, antialias: true })
  g.destroy()
  return tex
}

/** Gold glowing diamond for score gems dropped by destroyed enemies. */
export function makeGemTexture(renderer: Renderer, radius = 7): Texture {
  const g = new Graphics()
  const color = 0xffc832
  g.circle(0, 0, radius * 1.9).fill({ color, alpha: 0.14 })
  g.circle(0, 0, radius * 1.3).fill({ color, alpha: 0.3 })
  g.poly([0, -radius, radius * 0.7, 0, 0, radius, -radius * 0.7, 0]).fill(color)
  g.poly([0, -radius * 0.45, radius * 0.32, 0, 0, radius * 0.45, -radius * 0.32, 0])
    .fill(0xfff8dc)
  const tex = renderer.generateTexture({ target: g, antialias: true })
  g.destroy()
  return tex
}
