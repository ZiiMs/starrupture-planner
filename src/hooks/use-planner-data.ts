import { useQuery } from '@tanstack/react-query'
import { loadAllData } from '@/lib/data'
import type { Item, Building, Recipe, Corporation } from '@/types/planner'

export function usePlannerData() {
  return useQuery({
    queryKey: ['planner-data'],
    queryFn: async () => {
      const data = await loadAllData()
      return data
    },
    staleTime: Infinity,
  })
}

export function useItems() {
  return useQuery({
    queryKey: ['items'],
    queryFn: loadAllData,
    select: (data) => data.items,
    staleTime: Infinity,
  })
}

export function useBuildings() {
  return useQuery({
    queryKey: ['buildings'],
    queryFn: loadAllData,
    select: (data) => data.buildings,
    staleTime: Infinity,
  })
}

export function useRecipes() {
  return useQuery({
    queryKey: ['recipes'],
    queryFn: loadAllData,
    select: (data) => data.recipes,
    staleTime: Infinity,
  })
}

export function useCorporations() {
  return useQuery({
    queryKey: ['corporations'],
    queryFn: loadAllData,
    select: (data) => data.corporations,
    staleTime: Infinity,
  })
}

export type PlannerData = {
  items: Record<string, Item>
  buildings: Record<string, Building>
  recipes: Record<string, Recipe>
  corporations: Record<string, Corporation>
}
