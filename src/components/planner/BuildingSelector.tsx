'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  calculateOutputRate,
  calculatePowerConsumption,
  calculateBuildingsNeeded,
} from '@/lib/calculations'
import { getIcon } from '@/lib/icons'
import type { Building, Item, Recipe } from '@/types/planner'
import { useReactFlow } from '@xyflow/react'
import { nanoid } from 'nanoid'
import { memo, useState, useMemo } from 'react'
import type { Edge, Node } from '@xyflow/react'
import ElementSelector from './ElementSelector'

interface BuildingSelectorProps {
  buildings: Record<string, Building>
  recipes: Record<string, Recipe>
  items: Record<string, Item>
}

interface ProductionChainSummary {
  buildingId: string
  buildingName: string
  count: number
  outputRate: number
}

function BuildingSelectorComponent({
  buildings,
  recipes,
  items,
}: BuildingSelectorProps) {
  const { addNodes, addEdges } = useReactFlow()
  const [activeTab, setActiveTab] = useState<'buildings' | 'items'>('buildings')
  const [nodeCounter, setNodeCounter] = useState(0)

  // Item selection state
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [itemsPerMinute, setItemsPerMinute] = useState<string>('60')
  const [buildingSearch, setBuildingSearch] = useState('')
  const [itemSearch, setItemSearch] = useState('')

  const selectedItem = selectedItemId ? items[selectedItemId] : null

  // Calculate production chain summary for selected item and rate
  const productionSummary = useMemo(() => {
    if (!selectedItemId || !itemsPerMinute) return []

    const rate = parseFloat(itemsPerMinute)
    if (isNaN(rate) || rate <= 0) return []

    const summary: ProductionChainSummary[] = []
    const visitedRecipes = new Set<string>()

    const calculateForItem = (itemId: string, requiredRate: number) => {
      const recipesProducingItem = Object.values(recipes).filter((r) =>
        r.outputs.some((o) => o.itemId === itemId),
      )

      if (recipesProducingItem.length === 0) return

      const recipe = recipesProducingItem[0]
      const recipeKey = `${recipe.id}`
      if (visitedRecipes.has(recipeKey)) return
      visitedRecipes.add(recipeKey)

      const building = buildings[recipe.producers[0]]
      if (!building) return

      const outputPerBuilding = calculateOutputRate(recipe, building, 1)
      const buildingsNeeded = calculateBuildingsNeeded(recipe, building, requiredRate)

      summary.push({
        buildingId: building.id,
        buildingName: building.name,
        count: Math.ceil(buildingsNeeded),
        outputRate: outputPerBuilding,
      })

      // Calculate input requirements
      for (const input of recipe.inputs) {
        const inputRate = (input.amount / recipe.time) * 60 * buildingsNeeded
        calculateForItem(input.itemId, inputRate)
      }
    }

    calculateForItem(selectedItemId, rate)
    return summary
  }, [selectedItemId, itemsPerMinute, buildings, recipes])

  const addBuildingNode = (buildingId: string) => {
    const building = buildings[buildingId]
    const firstRecipe = Object.values(recipes).find((r) =>
      r.producers.includes(buildingId),
    )

    if (!firstRecipe) {
      console.error(`No recipe found for building: ${buildingId}`)
      return
    }

    const outputRate = calculateOutputRate(firstRecipe, building, 1)
    const powerConsumption = calculatePowerConsumption(building, 1)

    const x = 200 + (nodeCounter % 3) * 350
    const y = 300 + Math.floor(nodeCounter / 3) * 250

    addNodes({
      id: nanoid(),
      type: 'planner-node',
      position: { x, y },
      data: {
        buildingId,
        recipeId: firstRecipe.id,
        count: 1,
        outputRate,
        powerConsumption,
      },
    })

    setNodeCounter((c) => c + 1)
  }

  const addProductionChain = () => {
    if (!selectedItemId || !itemsPerMinute || productionSummary.length === 0) return

    const targetRate = parseFloat(itemsPerMinute)
    if (isNaN(targetRate) || targetRate <= 0) return

    const nodesToAdd: Node[] = []
    const edgesToAdd: Edge[] = []
    const levelCounts = new Map<number, number>()
    let nodesAdded = 0

    // Build from summary - create individual nodes for each building
    const buildFromSummary = (
      buildingInfo: ProductionChainSummary,
      level: number = 0,
      parentNodeId?: string,
      inputItemId?: string,
    ): void => {
      const building = buildings[buildingInfo.buildingId]
      const recipe = Object.values(recipes).find((r) =>
        r.producers.includes(buildingInfo.buildingId),
      )

      if (!building || !recipe) return

      // Create individual nodes for each building
      for (let i = 0; i < buildingInfo.count; i++) {
        const nodeId = nanoid()
        const outputRate = calculateOutputRate(recipe, building, 1)
        const powerConsumption = calculatePowerConsumption(building, 1)

        const x = 1200 - level * 350 + (i % 3) * 50
        const y = 200 + ((levelCounts.get(level) || 0) + Math.floor(i / 3)) * 80

        nodesToAdd.push({
          id: nodeId,
          type: 'planner-node',
          position: { x, y },
          data: {
            buildingId: building.id,
            recipeId: recipe.id,
            count: 1,
            outputRate,
            powerConsumption,
          },
        })

        levelCounts.set(level, (levelCounts.get(level) || 0) + 1)
        nodesAdded++

        // Create edges from each node to parent
        if (parentNodeId && inputItemId) {
          edgesToAdd.push({
            id: nanoid(),
            source: nodeId,
            target: parentNodeId,
            type: 'efficiency-edge',
            animated: true,
            data: {
              itemId: inputItemId,
              amount: 1,
              usageRate: 0,
              producerRate: outputRate,
              isWarning: false,
              sourceNodeId: nodeId,
              targetNodeId: parentNodeId,
            },
          })
        }
      }
    }

    // Process summary in reverse order (inputs first, outputs last)
    const reversedSummary = [...productionSummary].reverse()

    for (let i = 0; i < reversedSummary.length; i++) {
      const current = reversedSummary[i]
      const next = reversedSummary[i + 1]

      const recipe = Object.values(recipes).find((r) =>
        r.producers.includes(current.buildingId),
      )

      if (!recipe) continue

      // Get the input item for this building
      const inputItem = recipe.inputs[0]

      buildFromSummary(
        current,
        i,
        next ? getNodeIdForBuilding(nodesToAdd, next.buildingId) : undefined,
        inputItem?.itemId,
      )
    }

    if (nodesToAdd.length > 0) {
      addNodes(nodesToAdd)
      addEdges(edgesToAdd)
      setNodeCounter((c) => c + nodesAdded)
      setSelectedItemId(null)
      setItemsPerMinute('60')
    }
  }

  return (
    <Card className="w-80 shadow-lg">
      <CardHeader>
        <CardTitle className="text-sm">Add Elements</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden flex flex-col">
        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v as 'buildings' | 'items')
            setSelectedItemId(null)
            setItemsPerMinute('60')
            setBuildingSearch('')
            setItemSearch('')
          }}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="w-full">
            <TabsTrigger value="buildings">Buildings</TabsTrigger>
            <TabsTrigger value="items">Items</TabsTrigger>
          </TabsList>

          <TabsContent value="buildings" className="flex-1 overflow-hidden mt-3">
            <ElementSelector
              type="buildings"
              buildings={buildings}
              items={items}
              onSelectBuilding={addBuildingNode}
              onSelectItem={() => {}}
              searchQuery={buildingSearch}
              onSearchChange={setBuildingSearch}
            />
          </TabsContent>

          <TabsContent value="items" className="flex-1 overflow-hidden mt-3">
            {selectedItem ? (
              <div className="space-y-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedItemId(null)
                    setItemsPerMinute('60')
                  }}
                  className="mb-2"
                >
                  ← Back to items
                </Button>

                <div className="p-3 rounded-md bg-accent/50">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const ItemIcon = getIcon(selectedItem.icon)
                      return (
                        <>
                          <ItemIcon className="h-5 w-5" style={{ color: selectedItem.iconColor }} />
                          <span className="font-medium">{selectedItem.name}</span>
                        </>
                      )
                    })()}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rate">Target Production Rate</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="rate"
                      type="number"
                      min="1"
                      value={itemsPerMinute}
                      onChange={(e) => setItemsPerMinute(e.target.value)}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">items/min</span>
                  </div>
                </div>

                {productionSummary.length > 0 && (
                  <div className="space-y-2">
                    <Label>Production Chain</Label>
                    <div className="p-3 rounded-md bg-muted space-y-2">
                      {[...productionSummary].reverse().map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span>{item.buildingName}</span>
                          <span className="text-muted-foreground">×{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={addProductionChain}
                  className="w-full"
                  disabled={!itemsPerMinute || parseFloat(itemsPerMinute) <= 0 || productionSummary.length === 0}
                >
                  Place Production Chain
                </Button>
              </div>
            ) : (
              <ElementSelector
                type="items"
                buildings={buildings}
                items={items}
                onSelectBuilding={() => {}}
                onSelectItem={(itemId) => setSelectedItemId(itemId)}
                searchQuery={itemSearch}
                onSearchChange={setItemSearch}
              />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

// Helper to find a node ID for a building type
function getNodeIdForBuilding(nodes: Node[], buildingId: string): string | undefined {
  const node = nodes.find((n) => n.data.buildingId === buildingId)
  return node?.id as string | undefined
}

export default memo(BuildingSelectorComponent)
