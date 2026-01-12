import type { Item, Building, Recipe, Corporation } from '@/types/planner'

export async function loadItems(): Promise<Record<string, Item>> {
  const data = await import('@/data/items.json')
  return data.items.reduce(
    (acc, item) => {
      acc[item.id] = item
      return acc
    },
    {} as Record<string, Item>,
  )
}

export async function loadBuildings(): Promise<Record<string, Building>> {
  const data = await import('@/data/buildings.json')
  return data.buildings.reduce(
    (acc, building) => {
      acc[building.id] = building
      return acc
    },
    {} as Record<string, Building>,
  )
}

export async function loadRecipes(): Promise<Record<string, Recipe>> {
  const data = await import('@/data/recipes.json')
  return data.recipes.reduce(
    (acc, recipe) => {
      acc[recipe.id] = recipe
      return acc
    },
    {} as Record<string, Recipe>,
  )
}

export async function loadCorporations(): Promise<Record<string, Corporation>> {
  const data = await import('@/data/corporations.json')
  return (data.corporations as Corporation[]).reduce(
    (acc, corporation) => {
      acc[corporation.id] = corporation
      return acc
    },
    {} as Record<string, Corporation>,
  )
}

export async function loadAllData() {
  const [items, buildings, recipes, corporations] = await Promise.all([
    loadItems(),
    loadBuildings(),
    loadRecipes(),
    loadCorporations(),
  ])

  return { items, buildings, recipes, corporations }
}
