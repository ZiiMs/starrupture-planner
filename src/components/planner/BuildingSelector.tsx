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
import type { Building, Item, Recipe, PlannerNode, PlannerEdge } from '@/types/planner'
import { usePlannerStore } from '@/stores/planner-store'
import { nanoid } from 'nanoid'
import { memo, useState, useCallback, useMemo } from 'react'
import { getLayoutedElements } from '@/lib/dagre-layout'
import ElementSelector from './ElementSelector'

interface BuildingSelectorProps {
  buildings: Record<string, Building>
  recipes: Record<string, Recipe>
  items: Record<string, Item>
}

interface ProductionChainSummary {
  buildingId: string
  buildingName: string
  recipeId: string
  count: number
  outputRate: number
}

function BuildingSelectorComponent({
  buildings,
  recipes,
  items,
}: BuildingSelectorProps) {
  // Use store actions directly - they handle history capture internally
  const addNode = usePlannerStore((state) => state.addNode)
  const addEdge = usePlannerStore((state) => state.addEdge)

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
      const buildingsNeeded = calculateBuildingsNeeded(
        recipe,
        building,
        requiredRate,
      )

      summary.push({
        buildingId: building.id,
        buildingName: building.name,
        recipeId: recipe.id,
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

  const addBuildingNode = useCallback(
    (buildingId: string) => {
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

      const newNode: PlannerNode = {
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
      }

      // addNode captures history internally before adding
      addNode(newNode)
      setNodeCounter((c) => c + 1)
    },
    [buildings, recipes, nodeCounter, addNode],
  )

  const addProductionChain = useCallback(() => {
    if (!selectedItemId || !itemsPerMinute || productionSummary.length === 0)
      return

    const targetRate = parseFloat(itemsPerMinute)
    if (isNaN(targetRate) || targetRate <= 0) return

    const nodesToAdd: PlannerNode[] = []
    const edgesToAdd: PlannerEdge[] = []

    // Pass 1: Create all nodes, track IDs by building type
    const nodeIdMap = new Map<string, string[]>()

    productionSummary.forEach((buildingInfo) => {
      const building = buildings[buildingInfo.buildingId]
      // Use the stored recipeId, not search by building type
      const recipe = Object.values(recipes).find(
        (r) => r.id === buildingInfo.recipeId,
      )

      if (!building || !recipe) return

      const nodeIds: string[] = []

      for (let i = 0; i < buildingInfo.count; i++) {
        const nodeId = nanoid()
        const outputRate = calculateOutputRate(recipe, building, 1)
        const powerConsumption = calculatePowerConsumption(building, 1)

        nodesToAdd.push({
          id: nodeId,
          type: 'planner-node',
          position: { x: 0, y: 0 },
          data: {
            buildingId: building.id,
            recipeId: recipe.id,
            count: 1,
            outputRate,
            powerConsumption,
          },
        })

        nodeIds.push(nodeId)
      }

      nodeIdMap.set(buildingInfo.buildingId, nodeIds)
    })

    // Pass 2: Create edges with proper distribution (not all-to-all)
    productionSummary.forEach((buildingInfo) => {
      // Use the stored recipeId instead of searching by building type
      const recipe = Object.values(recipes).find(
        (r) => r.id === buildingInfo.recipeId,
      )

      if (!recipe || recipe.inputs.length === 0) return

      const inputItemId = recipe.inputs[0].itemId
      const inputAmount = recipe.inputs[0].amount

      // Find which building produces this input
      const inputBuildingSummary = productionSummary.find((bi) => {
        const biRecipe = Object.values(recipes).find(
          (r) => r.id === bi.recipeId,
        )
        return biRecipe?.outputs.some((o) => o.itemId === inputItemId)
      })

      if (!inputBuildingSummary) return

      const sourceNodeIds = nodeIdMap.get(inputBuildingSummary.buildingId) || []
      const targetNodeIds = nodeIdMap.get(buildingInfo.buildingId) || []

      // Calculate distribution - how many targets each source feeds
      const targetCount = targetNodeIds.length

      if (sourceNodeIds.length === 0 || targetCount === 0) return

      // Each target needs connections from enough sources to get required input
      // Spread sources evenly across targets
      const edgesPerTarget = Math.ceil(sourceNodeIds.length / targetCount)

      // Create distributed edges
      for (let targetIdx = 0; targetIdx < targetCount; targetIdx++) {
        // Each target gets connected to `edgesPerTarget` sources
        // Spread sources evenly: 0, 1, 2, ... modulo sourceNodeIds.length
        for (let j = 0; j < edgesPerTarget; j++) {
          const sourceIdx = (targetIdx + j) % sourceNodeIds.length
          const sourceId = sourceNodeIds[sourceIdx]
          const targetId = targetNodeIds[targetIdx]

          const sourceRecipe = Object.values(recipes).find(
            (r) => r.id === inputBuildingSummary.recipeId,
          )!
          const sourceBuilding = buildings[inputBuildingSummary.buildingId]

          edgesToAdd.push({
            id: nanoid(),
            source: sourceId,
            target: targetId,
            type: 'efficiency-edge',
            animated: true,
            data: {
              itemId: inputItemId,
              amount: inputAmount,
              usageRate: 0,
              producerRate: calculateOutputRate(
                sourceRecipe,
                sourceBuilding,
                1,
              ),
              isWarning: false,
              sourceNodeId: sourceId,
              targetNodeId: targetId,
            },
          })
        }
      }
    })

    // Apply dagre layout
    const { nodes: layoutedNodes } = getLayoutedElements(
      nodesToAdd,
      edgesToAdd,
      'LR',
    )

    if (layoutedNodes.length > 0) {
      // addNode captures history before each addition
      // Using individual adds to properly type the nodes
      layoutedNodes.forEach((node) => addNode(node as PlannerNode))
      edgesToAdd.forEach((edge) => addEdge(edge))

      setNodeCounter((c) => c + layoutedNodes.length)
      setSelectedItemId(null)
      setItemsPerMinute('60')
    }
  }, [
    selectedItemId,
    itemsPerMinute,
    productionSummary,
    buildings,
    recipes,
    addNode,
    addEdge,
  ])

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

          <TabsContent
            value="buildings"
            className="flex-1 overflow-hidden mt-3"
          >
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
                          <ItemIcon
                            className="h-5 w-5"
                            style={{ color: selectedItem.iconColor }}
                          />
                          <span className="font-medium">
                            {selectedItem.name}
                          </span>
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
                    <span className="text-sm text-muted-foreground">
                      items/min
                    </span>
                  </div>
                </div>

                {productionSummary.length > 0 && (
                  <div className="space-y-2">
                    <Label>Production Chain</Label>
                    <div className="p-3 rounded-md bg-muted space-y-2">
                      {[...productionSummary].reverse().map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span>{item.buildingName}</span>
                          <span className="text-muted-foreground">
                            ×{item.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={addProductionChain}
                  className="w-full"
                  disabled={
                    !itemsPerMinute ||
                    parseFloat(itemsPerMinute) <= 0 ||
                    productionSummary.length === 0
                  }
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

export default memo(BuildingSelectorComponent)
