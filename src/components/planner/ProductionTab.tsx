'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { getIcon } from '@/lib/icons'
import { getBaseItemName } from '@/lib/utils'
import { usePlannerStore } from '@/stores/planner-store'
import type {
  Building,
  Item,
  ProductionSourceBuildings,
  ProductionSourceRate,
  Recipe,
} from '@/types/planner'
import { Minus, Plus } from 'lucide-react'
import { nanoid } from 'nanoid'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'

interface ProductionTabProps {
  items: Record<string, Item>
  buildings: Record<string, Building>
  recipes: Record<string, Recipe>
}

function ProductionTabComponent({
  items,
  buildings,
  recipes,
}: ProductionTabProps) {
  // buildings prop is preserved for interface compatibility (unused in this component)
  void buildings

  // Use a version counter to force re-renders when store changes
  const [version, setVersion] = useState(0)

  // Force update on store changes
  useEffect(() => {
    const unsub = usePlannerStore.subscribe(() => {
      setVersion(v => v + 1)
    })
    return unsub
  }, [])

  // Get store state - will update when version changes
  const productionSources = useMemo(
    () => usePlannerStore.getState()?.productionSources ?? [],
    [version],
  )
  const nodes = useMemo(
    () => usePlannerStore.getState()?.present?.nodes ?? [],
    [version],
  )

  // Store action helpers
  const addProductionSource = useCallback((source: import('@/types/planner').ProductionSource) => {
    try {
      usePlannerStore.getState()?.addProductionSource?.(source)
    } catch (e) {
      console.error('addProductionSource error:', e)
    }
  }, [])
  const updateProductionSource = useCallback((id: string, data: Partial<import('@/types/planner').ProductionSource>) => {
    try {
      usePlannerStore.getState()?.updateProductionSource?.(id, data)
    } catch (e) {
      console.error('updateProductionSource error:', e)
    }
  }, [])
  const removeProductionSource = useCallback((id: string) => {
    try {
      usePlannerStore.getState()?.removeProductionSource?.(id)
    } catch (e) {
      console.error('removeProductionSource error:', e)
    }
  }, [])

  // Add Production Source dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [mode, setMode] = useState<'rate' | 'buildings'>('rate')
  const [rateValue, setRateValue] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  // Get all extraction recipes

  // Get the item display info for a base item name
  const getItemInfo = useCallback(
    (baseName: string) => {
      // Try exact match first
      if (items[baseName]) return items[baseName]
      // Try finding item with this base name
      return Object.values(items).find(
        (item) => getBaseItemName(item.id) === baseName,
      )
    },
    [items],
  )

  // Get total rate for an item (handles both rate mode and buildings mode)
  const getItemTotal = useCallback(
    (itemBaseName: string): number => {
      let total = 0
      productionSources.forEach((s) => {
        if (getBaseItemName(s.itemId) !== itemBaseName) return
        if (s.mode === 'rate') {
          total += s.rate
        } else if (s.mode === 'buildings') {
          const buildSource = s as ProductionSourceBuildings
          buildSource.buildings.forEach((b) => {
            const recipe = recipes[b.recipeId]
            if (recipe) {
              const output = recipe.outputs.find(
                (o) => getBaseItemName(o.itemId) === itemBaseName,
              )
              if (output) {
                total += (output.amount / recipe.time) * 60 * b.count
              }
            }
          })
        }
      })
      return Math.round(total * 100) / 100
    },
    [productionSources, recipes],
  )

  // Calculate total demand per item from nodes
  const demandByItem = useMemo(() => {
    const demand: Record<string, number> = {}
    nodes.forEach((node) => {
      const recipe = recipes[node.data.recipeId]
      if (!recipe) return
      recipe.inputs?.forEach((input) => {
        const baseItem = getBaseItemName(input.itemId)
        if (!baseItem) return
        const rateNeeded =
          (input.amount / recipe.time) * 60 * (node.data.count ?? 1)
        demand[baseItem] = (demand[baseItem] || 0) + rateNeeded
      })
    })
    // Round all values
    Object.keys(demand).forEach((key) => {
      demand[key] = Math.round(demand[key] * 100) / 100
    })
    return demand
  }, [recipes])

  // Handle adding a building
  const handleAdd = useCallback(
    (itemBaseName: string, recipeId: string) => {
      const state = usePlannerStore.getState()
      const currentSources = state.productionSources ?? []
      const recipe = recipes[recipeId]
      if (!recipe) return

      // Find existing source for this item
      const existingSource = currentSources.find((s) => {
        if (getBaseItemName(s.itemId) !== itemBaseName) return false
        if (s.mode !== 'buildings') return false
        const buildSource = s as ProductionSourceBuildings
        return buildSource.buildings.some((b) => b.recipeId === recipeId)
      })

      if (existingSource) {
        const buildSource = existingSource as ProductionSourceBuildings
        const updatedBuildings = buildSource.buildings.map((b) => {
          if (b.recipeId === recipeId) return { ...b, count: b.count + 1 }
          return b
        })
        updateProductionSource(existingSource.id, {
          buildings: updatedBuildings,
        })
      } else {
        const newSource: ProductionSourceBuildings = {
          id: nanoid(),
          mode: 'buildings',
          itemId: itemBaseName,
          buildings: [{ buildingId: recipe.producers[0], recipeId, count: 1 }],
        }
        addProductionSource(newSource)
      }
    },
    [recipes, updateProductionSource, addProductionSource],
  )

  // Handle removing a building
  const handleRemove = useCallback(
    (itemBaseName: string, recipeId: string) => {
      const state = usePlannerStore.getState()
      const currentSources = state.productionSources ?? []

      const existingSource = currentSources.find((s) => {
        if (getBaseItemName(s.itemId) !== itemBaseName) return false
        if (s.mode !== 'buildings') return false
        const buildSource = s as ProductionSourceBuildings
        return buildSource.buildings.some((b) => b.recipeId === recipeId)
      })
      if (!existingSource) return

      const buildSource = existingSource as ProductionSourceBuildings
      const targetBuilding = buildSource.buildings.find(
        (b) => b.recipeId === recipeId,
      )
      if (!targetBuilding) return

      if (targetBuilding.count > 1) {
        // Decrement
        const updatedBuildings = buildSource.buildings.map((b) => {
          if (b.recipeId === recipeId) return { ...b, count: b.count - 1 }
          return b
        })
        updateProductionSource(existingSource.id, {
          buildings: updatedBuildings,
        })
      } else if (buildSource.buildings.length === 1) {
        // Remove entire source
        removeProductionSource(existingSource.id)
      } else {
        // Remove just this building
        const updatedBuildings = buildSource.buildings.filter(
          (b) => b.recipeId !== recipeId,
        )
        updateProductionSource(existingSource.id, {
          buildings: updatedBuildings,
        })
      }
    },
    [updateProductionSource, removeProductionSource],
  )

  // Reset add dialog state
  const resetAddDialog = useCallback(() => {
    setAddDialogOpen(false)
    setSelectedItemId(null)
    setMode('rate')
    setRateValue('')
    setSearchQuery('')
  }, [])

  // Handle adding a rate-based production source
  const handleAddRateSource = useCallback(() => {
    if (!selectedItemId || !rateValue) return
    const rate = parseFloat(rateValue)
    if (isNaN(rate) || rate <= 0) return

    const baseItemName = getBaseItemName(selectedItemId)
    if (!baseItemName) return

    const state = usePlannerStore.getState()
    const currentSources = state.productionSources ?? []

    // Check if a rate source already exists for this item
    const existingSource = currentSources.find(
      (s) => getBaseItemName(s.itemId) === baseItemName && s.mode === 'rate',
    ) as ProductionSourceRate | undefined

    if (existingSource) {
      // Update existing rate source
      updateProductionSource(existingSource.id, { rate: existingSource.rate + rate })
    } else {
      // Create new rate source
      const newSource: ProductionSourceRate = {
        id: nanoid(),
        mode: 'rate',
        itemId: baseItemName,
        rate,
      }
      addProductionSource(newSource)
    }

    resetAddDialog()
  }, [selectedItemId, rateValue, updateProductionSource, addProductionSource, resetAddDialog])

  // Handle adding a buildings-based production source for any item
  const handleAddBuildingsSource = useCallback(
    (itemBaseName: string, recipeId: string) => {
      const recipe = recipes[recipeId]
      if (!recipe) return

      const state = usePlannerStore.getState()
      const currentSources = state.productionSources ?? []

      // Check if source already exists for this item
      const existingSource = currentSources.find((s) => {
        if (getBaseItemName(s.itemId) !== itemBaseName) return false
        if (s.mode !== 'buildings') return false
        const buildSource = s as ProductionSourceBuildings
        return buildSource.buildings.some((b) => b.recipeId === recipeId)
      })

      if (existingSource) {
        const buildSource = existingSource as ProductionSourceBuildings
        const updatedBuildings = buildSource.buildings.map((b) => {
          if (b.recipeId === recipeId) return { ...b, count: b.count + 1 }
          return b
        })
        updateProductionSource(existingSource.id, {
          buildings: updatedBuildings,
        })
      } else {
        const newSource: ProductionSourceBuildings = {
          id: nanoid(),
          mode: 'buildings',
          itemId: itemBaseName,
          buildings: [{ buildingId: recipe.producers[0], recipeId, count: 1 }],
        }
        addProductionSource(newSource)
      }

      resetAddDialog()
    },
    [recipes, updateProductionSource, addProductionSource, resetAddDialog],
  )

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    const itemList = Object.values(items)
    if (!searchQuery) return itemList
    const query = searchQuery.toLowerCase()
    return itemList.filter((item) => item.name.toLowerCase().includes(query))
  }, [items, searchQuery])

  // Get the recipe for a specific item by matching itemId directly
  const getItemRecipe = useCallback(
    (itemId: string) => {
      // Find recipe that produces this exact item ID
      return Object.values(recipes).find(recipe => {
        return recipe.outputs.some(output => output.itemId === itemId)
      }) || null
    },
    [recipes],
  )

  // Get available recipe for selected item (in buildings mode)
  const selectedItemRecipe = useMemo(() => {
    if (!selectedItemId) return null
    return getItemRecipe(selectedItemId)
  }, [selectedItemId, getItemRecipe])

  return (
    <div className="space-y-3">
      {/* Add Production Source button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setAddDialogOpen(true)}
      >
        <Plus className="h-3 w-3 mr-1" />
        Add Production Source
      </Button>

      {/* Add Production Source Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Add Production Source</DialogTitle>
          </DialogHeader>

          {!selectedItemId ? (
            /* Item selector */
            <div className="space-y-3">
              <div className="relative">
                <Input
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {filteredItems.map((item) => {
                  const baseName = getBaseItemName(item.id)
                  const ItemIcon = getIcon(item.icon)
                  const hasExtractionRecipes = baseName && getItemRecipe(baseName) !== null

                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 p-2 hover:bg-muted cursor-pointer rounded"
                      onClick={() => {
                        setSelectedItemId(item.id)
                        if (baseName && !hasExtractionRecipes) {
                          setMode('rate')
                        }
                      }}
                    >
                      {ItemIcon && (
                        <ItemIcon className="h-4 w-4 shrink-0" style={{ color: item.iconColor }} />
                      )}
                      <span className="text-sm truncate">{item.name}</span>
                      {!hasExtractionRecipes && (
                        <span className="text-[10px] text-muted-foreground">Rate only</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* Mode selector and input */
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {(() => {
                  const item = items[selectedItemId] || Object.values(items).find(i => getBaseItemName(i.id) === getBaseItemName(selectedItemId))
                  const ItemIcon = item ? getIcon(item.icon) : null
                  return (
                    <>
                      {ItemIcon && <ItemIcon className="h-4 w-4" style={{ color: item?.iconColor }} />}
                      <span className="text-sm font-medium">{item?.name || selectedItemId}</span>
                    </>
                  )
                })()}
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === 'rate'}
                    onChange={() => setMode('rate')}
                  />
                  Rate Mode
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === 'buildings'}
                    onChange={() => setMode('buildings')}
                  />
                  Buildings Mode
                </label>
              </div>

              {mode === 'rate' ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Rate (e.g., 240)"
                    value={rateValue}
                    onChange={(e) => setRateValue(e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground">/min</span>
                </div>
                ) : selectedItemRecipe ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2 p-3 bg-muted rounded">
                      <span className="text-sm font-medium">{selectedItemRecipe.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {(() => {
                          const output = selectedItemRecipe.outputs.find(
                            (o) => getBaseItemName(o.itemId) === getBaseItemName(selectedItemId),
                          )
                          return output ? `${((output.amount / selectedItemRecipe.time) * 60).toFixed(0)}/min` : '?'
                        })()}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => {
                          const baseName = getBaseItemName(selectedItemId)
                          if (baseName) handleAddBuildingsSource(baseName, selectedItemRecipe.id)
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Adds an excavator producing {items[selectedItemId]?.name || selectedItemId}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No recipe available.</p>
                )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedItemId(null)
                    setSearchQuery('')
                  }}
                >
                  Back
                </Button>
                {mode === 'rate' && (
                  <Button
                    className="flex-1"
                    size="sm"
                    disabled={!rateValue || isNaN(parseFloat(rateValue)) || parseFloat(rateValue) <= 0}
                    onClick={handleAddRateSource}
                  >
                    Add Rate
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Get all items that have production sources */}
      {(() => {
        const itemsWithSources = new Set(productionSources.map(s => getBaseItemName(s.itemId)).filter(Boolean))
        
        if (itemsWithSources.size === 0) {
          return (
            <div className="text-center py-4 text-xs text-muted-foreground">
              No production sources. Click [+ Add Production Source] to add resources.
            </div>
          )
        }

        return Array.from(itemsWithSources).map(baseName => {
          const itemInfo = getItemInfo(baseName)
          const ItemIcon = itemInfo ? getIcon(itemInfo.icon) : null
          const itemTotal = getItemTotal(baseName)
          const itemDemand = demandByItem[baseName] || 0
          const available = itemTotal - itemDemand

          // Get sources for this item
          const sources = productionSources.filter(s => getBaseItemName(s.itemId) === baseName)

          // Determine color and display for available
          const availableColor =
            available > 0
              ? 'text-green-600'
              : available < 0
                ? 'text-red-600'
                : 'text-muted-foreground'
          const availablePrefix = available > 0 ? '+' : ''

          return (
            <div key={baseName} className="space-y-1">
              {/* Header with totals */}
              <div className="flex items-center gap-1.5">
                {ItemIcon && (
                  <ItemIcon
                    className="h-4 w-4"
                    style={{ color: itemInfo?.iconColor }}
                  />
                )}
                <span className="font-medium text-xs min-w-0 flex-1">
                  {itemInfo?.name || baseName}
                </span>
                <span className="text-xs text-muted-foreground w-12 text-right">
                  {itemTotal > 0 ? `${itemTotal.toFixed(0)}/min` : '0/min'}
                </span>
                <span className="text-xs text-muted-foreground w-12 text-right">
                  {itemDemand > 0 ? `${itemDemand.toFixed(0)}/min` : '-'}
                </span>
                <span
                  className={`text-xs font-medium ml-auto w-20 text-right ${availableColor}`}
                >
                  {available === 0 ? (
                    '0/min'
                  ) : (
                    <>
                      {available > 0 ? '🟢' : '🔴'}
                      {availablePrefix}
                      {available.toFixed(0)}/min
                    </>
                  )}
                </span>
              </div>

              {/* Show sources */}
              <div className="ml-5 space-y-0.5">
                {sources.map((source) => {
                  if (source.mode === 'rate') {
                    const rateSource = source as ProductionSourceRate
                    return (
                      <div
                        key={source.id}
                        className="flex items-center gap-2 text-xs"
                      >
                        <span className="text-muted-foreground">
                          Rate: {rateSource.rate}/min
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => removeProductionSource(source.id)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                      </div>
                    )
                  } else {
                    const buildSource = source as ProductionSourceBuildings
                    return buildSource.buildings.map((building) => {
                      const recipe = recipes[building.recipeId]
                      const count = building.count
                      const output = recipe?.outputs.find(
                        (o) => getBaseItemName(o.itemId) === baseName,
                      )
                      const ratePerBuilding = output
                        ? (output.amount / (recipe?.time || 1)) * 60
                        : 0

                      let recipeName = recipe?.name || building.recipeId
                      if (itemInfo?.name) {
                        recipeName = recipeName.replace(itemInfo.name, '').trim()
                      }
                      if (!recipeName) recipeName = 'Normal'

                      return (
                        <div
                          key={`${source.id}-${building.recipeId}`}
                          className="flex items-center gap-2 text-xs"
                        >
                          <span className="text-muted-foreground min-w-0 flex-1">
                            {recipeName}
                          </span>

                          <Button
                            variant="outline"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => handleRemove(baseName, building.recipeId)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>

                          <span className="w-6 text-center font-medium">{count}</span>

                          <Button
                            variant="default"
                            size="icon"
                            className="h-5 w-5 bg-green-600 hover:bg-green-700"
                            onClick={() => handleAdd(baseName, building.recipeId)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>

                          <span className="text-muted-foreground ml-auto text-[10px]">
                            {count > 0 && `${(count * ratePerBuilding).toFixed(0)}/min`}
                          </span>
                        </div>
                      )
                    })
                  }
                })}
              </div>
            </div>
          )
        })
      })()}
    </div>
  )
}

export const ProductionTab = memo(ProductionTabComponent)
