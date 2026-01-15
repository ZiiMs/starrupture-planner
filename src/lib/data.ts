import type { Item, Building, Recipe, Corporation } from '@/types/planner'
import itemsData from '@/data/items.json'
import buildingsData from '@/data/buildings.json'
import recipesData from '@/data/recipes.json'
import corporationsData from '@/data/corporations.json'

export function loadItems(): Record<string, Item> {
  return (itemsData.items as Item[]).reduce(
    (acc, item) => {
      acc[item.id] = item
      return acc
    },
    {} as Record<string, Item>,
  )
}

export function loadBuildings(): Record<string, Building> {
  return (buildingsData.buildings as Building[]).reduce(
    (acc, building) => {
      acc[building.id] = building
      return acc
    },
    {} as Record<string, Building>,
  )
}

export function loadRecipes(): Record<string, Recipe> {
  return (recipesData.recipes as Recipe[]).reduce(
    (acc, recipe) => {
      acc[recipe.id] = recipe
      return acc
    },
    {} as Record<string, Recipe>,
  )
}

export function loadCorporations(): Record<string, Corporation> {
  return (corporationsData.corporations as Corporation[]).reduce(
    (acc, corporation) => {
      acc[corporation.id] = corporation
      return acc
    },
    {} as Record<string, Corporation>,
  )
}

export function loadAllData() {
  return {
    items: loadItems(),
    buildings: loadBuildings(),
    recipes: loadRecipes(),
    corporations: loadCorporations(),
  }
}
