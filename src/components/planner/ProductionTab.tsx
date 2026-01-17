'use client'

import { Button } from '@/components/ui/button'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { getIcon } from '@/lib/icons'
import { getBaseItemName } from '@/lib/utils'
import {
  selectNodes,
  selectProductionSources,
  usePlannerStore,
} from '@/stores/planner-store'
import type {
  Building,
  Item,
  ProductionSourceBuildings,
  ProductionSourceRate,
  Recipe,
} from '@/types/planner'
import { Minus, Plus, Search, X as XIcon } from 'lucide-react'
import { nanoid } from 'nanoid'
import { memo, useCallback, useMemo, useState } from 'react'

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
  const productionSources = usePlannerStore(selectProductionSources)
  const nodes = usePlannerStore(selectNodes)
  const addProductionSource = usePlannerStore(
    (state) => state.addProductionSource,
  )
  const updateProductionSource = usePlannerStore(
    (state) => state.updateProductionSource,
  )
  const removeProductionSource = usePlannerStore(
    (state) => state.removeProductionSource,
  )

  // Add Production Source dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [mode, setMode] = useState<'rate' | 'buildings'>('rate')
  const [rateValue, setRateValue] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  // Get all extraction recipes
  const extractionRecipes = useMemo(() => {
    return Object.values(recipes).filter((r) => r.category === 'extraction')
  }, [recipes])

  // Group extraction recipes by base item name
  const groupedRecipes = useMemo(() => {
    const groups: Record<string, typeof extractionRecipes> = {}
    extractionRecipes.forEach((recipe) => {
      const baseName = recipe.outputs
        .map((o) => getBaseItemName(o.itemId))
        .filter((n): n is string => n !== undefined)[0]
      if (baseName) {
        if (!groups[baseName]) groups[baseName] = []
        groups[baseName].push(recipe)
      }
    })
    return groups
  }, [extractionRecipes])

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

  // Get count for a specific recipe
  const getRecipeCount = useCallback(
    (itemBaseName: string, recipeId: string): number => {
      const source = productionSources.find((s) => {
        if (getBaseItemName(s.itemId) !== itemBaseName) return false
        if (s.mode !== 'buildings') return false
        const buildSource = s as ProductionSourceBuildings
        return buildSource.buildings.some((b) => b.recipeId === recipeId)
      })
      if (!source) return 0
      const buildSource = source as ProductionSourceBuildings
      const building = buildSource.buildings.find(
        (b) => b.recipeId === recipeId,
      )
      return building?.count || 0
    },
    [productionSources],
  )

  // Get total rate for an item
  const getItemTotal = useCallback(
    (itemBaseName: string): number => {
      let total = 0
      productionSources.forEach((s) => {
        if (getBaseItemName(s.itemId) !== itemBaseName) return
        if (s.mode !== 'buildings') return
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
  }, [nodes, recipes])

  // Handle adding a building
  const handleAdd = useCallback(
    (itemBaseName: string, recipeId: string) => {
      // Find existing source for this item
      const existingSource = productionSources.find((s) => {
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
        // Create new source
        const recipe = recipes[recipeId]
        const newSource: ProductionSourceBuildings = {
          id: nanoid(),
          mode: 'buildings',
          itemId: itemBaseName,
          buildings: [{ buildingId: recipe.producers[0], recipeId, count: 1 }],
        }
        addProductionSource(newSource)
      }
    },
    [productionSources, recipes, updateProductionSource, addProductionSource],
  )

  // Handle removing a building
  const handleRemove = useCallback(
    (itemBaseName: string, recipeId: string) => {
      const existingSource = productionSources.find((s) => {
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
    [productionSources, updateProductionSource, removeProductionSource],
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

    // Check if a rate source already exists for this item
    const existingSource = productionSources.find(
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
  }, [selectedItemId, rateValue, productionSources, updateProductionSource, addProductionSource, resetAddDialog])

  // Handle adding a buildings-based production source for any item
  const handleAddBuildingsSource = useCallback(
    (itemBaseName: string, recipeId: string) => {
      const recipe = recipes[recipeId]
      if (!recipe) return

      // Check if source already exists for this item
      const existingSource = productionSources.find((s) => {
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
    [recipes, productionSources, updateProductionSource, addProductionSource, resetAddDialog],
  )

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    const itemList = Object.values(items)
    if (!searchQuery) return itemList
    const query = searchQuery.toLowerCase()
    return itemList.filter((item) => item.name.toLowerCase().includes(query))
  }, [items, searchQuery])

  // Get extraction recipes for a specific item
  const getItemExtractionRecipes = useCallback(
    (itemBaseName: string) => {
      return extractionRecipes.filter((recipe) => {
        return recipe.outputs.some(
          (output) => getBaseItemName(output.itemId) === itemBaseName,
        )
      })
    },
    [extractionRecipes],
  )

  // Get available recipes for selected item (in buildings mode)
  const selectedItemRecipes = useMemo(() => {
    if (!selectedItemId) return []
    const baseName = getBaseItemName(selectedItemId)
    if (!baseName) return []
    return getItemExtractionRecipes(baseName)
  }, [selectedItemId, getItemExtractionRecipes])

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
      <CommandDialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <div className="p-3 border-b">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-sm">Add Production Source</h3>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={resetAddDialog}
            >
              <XIcon className="h-3 w-3" />
            </Button>
          </div>

          {!selectedItemId ? (
            /* Item selector */
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                className="pl-7"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          ) : (
            /* Mode selector and input */
            <div className="space-y-3">
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
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="ml-auto"
                  onClick={() => {
                    setSelectedItemId(null)
                    setSearchQuery('')
                  }}
                >
                  <XIcon className="h-3 w-3" />
                </Button>
              </div>

              <RadioGroup value={mode} onValueChange={(v) => setMode(v as 'rate' | 'buildings')}>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="rate" id="mode-rate" />
                  <Label htmlFor="mode-rate">Rate Mode</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="buildings" id="mode-buildings" />
                  <Label htmlFor="mode-buildings">Buildings Mode</Label>
                </div>
              </RadioGroup>

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
              ) : (
                <div className="text-xs text-muted-foreground">
                  {selectedItemRecipes.length > 0 ? (
                    <div className="space-y-1">
                      {selectedItemRecipes.map((recipe) => {
                        const output = recipe.outputs.find(
                          (o) => getBaseItemName(o.itemId) === getBaseItemName(selectedItemId),
                        )
                        const ratePerBuilding = output
                          ? (output.amount / recipe.time) * 60
                          : 0
                        const recipeName =
                          recipe.name.replace(items[selectedItemId]?.name || '', '').trim() ||
                          'Normal'

                        return (
                          <div
                            key={recipe.id}
                            className="flex items-center gap-2 p-2 hover:bg-muted cursor-pointer"
                            onClick={() => {
                              const baseName = getBaseItemName(selectedItemId)
                              if (baseName) handleAddBuildingsSource(baseName, recipe.id)
                            }}
                          >
                            <span className="flex-1 truncate">{recipeName}</span>
                            <span className="text-muted-foreground">{ratePerBuilding.toFixed(0)}/min</span>
                            <Plus className="h-3 w-3" />
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="py-2">No extraction recipes available for this item.</p>
                  )}
                </div>
              )}

              {mode === 'rate' && (
                <Button
                  className="w-full"
                  size="sm"
                  disabled={!rateValue || isNaN(parseFloat(rateValue)) || parseFloat(rateValue) <= 0}
                  onClick={handleAddRateSource}
                >
                  Add Rate Source
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Item list */}
        {!selectedItemId && (
          <CommandList className="max-h-60">
            <CommandEmpty className="py-6 text-center text-xs text-muted-foreground">
              No items found
            </CommandEmpty>
            <CommandGroup>
              {filteredItems.map((item) => {
                const baseName = getBaseItemName(item.id)
                const ItemIcon = getIcon(item.icon)
                const hasExtractionRecipes = baseName && getItemExtractionRecipes(baseName).length > 0

                return (
                  <CommandItem
                    key={item.id}
                    value={item.name}
                    onSelect={() => {
                      setSelectedItemId(item.id)
                      // If item has no extraction recipes, default to rate mode
                      if (baseName && !hasExtractionRecipes) {
                        setMode('rate')
                      }
                    }}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {ItemIcon && (
                        <ItemIcon className="h-4 w-4 shrink-0" style={{ color: item.iconColor }} />
                      )}
                      <span className="truncate">{item.name}</span>
                      {!hasExtractionRecipes && (
                        <span className="text-[10px] text-muted-foreground ml-auto">Rate only</span>
                      )}
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        )}
      </CommandDialog>

      {Object.entries(groupedRecipes).map(([baseName, oreRecipes]) => {
        const itemInfo = getItemInfo(baseName)
        const ItemIcon = itemInfo ? getIcon(itemInfo.icon) : null
        const itemTotal = getItemTotal(baseName)
        const itemDemand = demandByItem[baseName] || 0
        const available = itemTotal - itemDemand

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
            <div className="flex items-center gap-1.5">
              {ItemIcon && (
                <ItemIcon
                  className="h-4 w-4"
                  style={{ color: itemInfo?.iconColor }}
                />
              )}
              <span className="font-medium text-xs w-16 truncate">
                {itemInfo?.name || baseName}
              </span>
              <span className="text-xs text-muted-foreground w-12 text-right">
                {itemTotal}/min
              </span>
              <span className="text-xs text-muted-foreground w-12 text-right">
                {itemDemand > 0 ? `${itemDemand}/min` : '-'}
              </span>
              <span
                className={`text-xs font-medium ml-auto w-16 text-right ${availableColor}`}
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

            <div className="space-y-0.5 ml-5">
              {oreRecipes.map((recipe) => {
                const count = getRecipeCount(baseName, recipe.id)
                const output = recipe.outputs.find(
                  (o) => getBaseItemName(o.itemId) === baseName,
                )
                const ratePerBuilding = output
                  ? (output.amount / recipe.time) * 60
                  : 0
                const recipeName =
                  recipe.name.replace(itemInfo?.name || '', '').trim() ||
                  'Normal'

                return (
                  <div
                    key={recipe.id}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="w-12 text-muted-foreground truncate">
                      {recipeName}
                    </span>

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleRemove(baseName, recipe.id)}
                      disabled={count === 0}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>

                    <span className="w-6 text-center font-medium">{count}</span>

                    <Button
                      variant="default"
                      size="icon"
                      className="h-6 w-6 bg-green-600 hover:bg-green-700"
                      onClick={() => handleAdd(baseName, recipe.id)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>

                    <span className="text-muted-foreground ml-auto text-[10px]">
                      {count > 0 &&
                        `${(count * ratePerBuilding).toFixed(0)}/min`}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {Object.keys(groupedRecipes).length === 0 && (
        <div className="text-center py-4 text-xs text-muted-foreground">
          No extraction recipes found
        </div>
      )}
    </div>
  )
}

export const ProductionTab = memo(ProductionTabComponent)
