import type { Building, Recipe, PlannerNodeData } from '@/types/planner'

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

export interface EfficiencyResult {
  usageRate: number
  producerRate: number
  efficiencyRatio: number
  isWarning: boolean
}

export function calculateEfficiency(
  producerNode: PlannerNodeData,
  producerRecipe: Recipe,
  producerBuilding: Building,
  consumerRecipe: Recipe,
  inputItemId: string,
): EfficiencyResult {
  // Calculate consumer's input requirement per minute
  const inputAmount =
    consumerRecipe.inputs.find((i) => i.itemId === inputItemId)?.amount || 1
  const usageRate = (inputAmount / consumerRecipe.time) * 60

  // Calculate producer's output rate
  const producerRate = calculateOutputRate(producerRecipe, producerBuilding, producerNode.count)

  // Calculate efficiency ratio (consumer need / producer output)
  const efficiencyRatio = usageRate > 0 ? producerRate / usageRate : 1

  // Warning if producer can make more than consumer needs
  const isWarning = producerRate > usageRate

  return {
    usageRate,
    producerRate,
    efficiencyRatio,
    isWarning,
  }
}
