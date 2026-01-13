import type { Building, Recipe } from '@/types/planner'

export function calculateOutputRate(
  recipe: Recipe,
  building: Building,
  count: number,
): number {
  const speed = building.speed
  const craftsPerSecond = (count * speed) / recipe.time
  const itemsPerMinute = craftsPerSecond * 60 * recipe.outputs[0].amount
  return itemsPerMinute
}

export function calculatePowerConsumption(
  building: Building,
  count: number,
): number {
  return building.powerUsage * count + building.powerDrain * count
}

export function calculateBuildingsNeeded(
  recipe: Recipe,
  building: Building,
  targetOutputPerMinute: number,
): number {
  const outputRatePerBuilding = calculateOutputRate(recipe, building, 1)
  return targetOutputPerMinute / outputRatePerBuilding
}
