import { gameStore, WeaponType } from '../../store/gameStore'
import { PickupPool, PickupType } from '../entities/Pickup'

// Every kill path uses this table, so Vulcan, Laser, Plasma, and bombs all
// produce the same overall pickup frequency.
const ONEUP_CHANCE = 0.02
const BOMB_CHANCE = 0.08
const WEAPON_CHANCE = 0.30

const STAGE_WEAPON: Record<number, WeaponType> = {
  1: 'vulcan',
  2: 'laser',
  3: 'plasma',
}

function pickupForWeapon(weapon: WeaponType): PickupType {
  return weapon === 'vulcan' ? 'power' : weapon
}

/** Weighted toward the equipped weapon, then the stage's featured weapon.
 *  This lets players build power instead of being forced to switch repeatedly. */
function chooseWeapon(): WeaponType {
  const { weapon, stage } = gameStore.getState()
  const featured = STAGE_WEAPON[stage] ?? 'vulcan'
  const weapons: WeaponType[] = ['vulcan', 'laser', 'plasma']
  const weights = weapons.map((candidate) =>
    1 + (candidate === weapon ? 4 : 0) + (candidate === featured ? 3 : 0))
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  let roll = Math.random() * total
  for (let i = 0; i < weapons.length; i++) {
    roll -= weights[i]
    if (roll <= 0) return weapons[i]
  }
  return weapon
}

export function spawnEnemyDrop(pickups: PickupPool, x: number, y: number) {
  const roll = Math.random()
  if (roll < ONEUP_CHANCE) {
    pickups.spawn(x, y, 'oneup')
  } else if (roll < BOMB_CHANCE) {
    pickups.spawn(x, y, 'bomb')
  } else if (roll < WEAPON_CHANCE) {
    pickups.spawn(x, y, pickupForWeapon(chooseWeapon()))
  }
}
