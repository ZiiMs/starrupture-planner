'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAutoLayout } from '@/hooks/useAutoLayout'
import {
  calculateBuildingsNeeded,
  calculateOutputRate,
  calculatePowerConsumption,
} from '@/lib/calculations'
import {
  estimateNodeHeight,
  getLayoutedElements,
  NODE_WIDTH,
} from '@/lib/dagre-layout'
import { getIcon } from '@/lib/icons'
import { usePlannerStore } from '@/stores/planner-store'
import type {
  Building,
  Item,
  PlannerEdge,
  PlannerNode,
  Recipe,
} from '@/types/planner'
import { useReactFlow } from '@xyflow/react'
import { nanoid } from 'nanoid'
import { memo, useCallback, useMemo, useState } from 'react'
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
  const { getViewport } = useReactFlow()

  // Get viewport center position for placing new nodes
  const getViewportCenter = useCallback(() => {
    const viewport = getViewport()
    const sidebarWidth = 320
    const viewportWidth =
      typeof window !== 'undefined' ? window.innerWidth - sidebarWidth : 1000
    const viewportHeight =
      typeof window !== 'undefined' ? window.innerHeight : 800
    // Convert screen center to flow coordinates
    // transform: translate(x,y) scale(zoom) means:
    // flowX = (screenX - viewport.x) / zoom
    const centerX = (viewportWidth / 2 - viewport.x) / viewport.zoom
    const centerY = (viewportHeight / 2 - viewport.y) / viewport.zoom
    return { x: centerX, y: centerY }
  }, [getViewport])

  const { runAutoLayout } =
    useAutoLayout()

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
        count: buildingsNeeded,
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

      const center = getViewportCenter()
      // Offset slightly so nodes don't stack exactly on top of each other
      const x = center.x + (nodeCounter % 3) * 20
      const y = center.y + Math.floor(nodeCounter / 3) * 20

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
      const recipe = Object.values(recipes).find(
        (r) => r.id === buildingInfo.recipeId,
      )

      if (!building || !recipe) return

      const outputRate = calculateOutputRate(
        recipe,
        building,
        buildingInfo.count,
      )
      const powerConsumption = calculatePowerConsumption(
        building,
        buildingInfo.count,
      )

      const nodeId = nanoid()

      nodesToAdd.push({
        id: nodeId,
        type: 'planner-node',
        position: { x: 0, y: 0 },
        data: {
          buildingId: building.id,
          recipeId: recipe.id,
          count: buildingInfo.count,
          outputRate,
          powerConsumption,
        },
      })

      // Use composite key (buildingId:recipeId) for node ID mapping
      const nodeKey = `${buildingInfo.buildingId}:${buildingInfo.recipeId}`
      nodeIdMap.set(nodeKey, nodeId)
    })

    // Pass 2: Create edges for ALL inputs of each recipe
    productionSummary.forEach((buildingInfo) => {
      const recipe = Object.values(recipes).find(
        (r) => r.id === buildingInfo.recipeId,
      )

      if (!recipe || recipe.inputs.length === 0) return

      // Use composite key for target node
      const targetNodeKey = `${buildingInfo.buildingId}:${buildingInfo.recipeId}`
      const targetNodeId = nodeIdMap.get(targetNodeKey)
      if (!targetNodeId) return

      // Loop through ALL inputs, not just the first!
      for (const input of recipe.inputs) {
        const inputItemId = input.itemId
        const inputAmount = input.amount

        // Find ALL buildings that produce this input item
        const producingBuildings = productionSummary.filter((bi) => {
          const biRecipe = Object.values(recipes).find(
            (r) => r.id === bi.recipeId,
          )
          return biRecipe?.outputs.some((o) => o.itemId === inputItemId)
        })

        // Create edges from each producer
        producingBuildings.forEach((pb) => {
          // Use composite key for source node
          const sourceNodeKey = `${pb.buildingId}:${pb.recipeId}`
          const sourceNodeId = nodeIdMap.get(sourceNodeKey)
          if (!sourceNodeId) return

          const sourceRecipe = Object.values(recipes).find(
            (r) => r.id === pb.recipeId,
          )!
          const sourceBuilding = buildings[pb.buildingId]

          edgesToAdd.push({
            id: nanoid(),
            source: sourceNodeId,
            target: targetNodeId,
            targetHandle: `input-${inputItemId}`,
            type: 'efficiency-edge',
            animated: true,
            data: {
              itemId: inputItemId,
              amount: inputAmount,
              usageRate: (inputAmount / recipe.time) * 60 * buildingInfo.count,
              producerRate: calculateOutputRate(
                sourceRecipe,
                sourceBuilding,
                pb.count,
              ),
              isWarning: false,
              sourceNodeId,
              targetNodeId,
            },
          })
        })
      }
    })

    // Apply dagre layout for centering calculation
    const { nodes: layoutedNodes } = getLayoutedElements(
      nodesToAdd,
      edgesToAdd,
      'LR',
      recipes,
    )

    if (layoutedNodes.length > 0) {
      // Calculate offset to center the layout in the viewport
      const center = getViewportCenter()

      // Find the center of the layouted nodes using estimated heights
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity
      for (const node of layoutedNodes) {
        const nodeWidth = node.measured?.width ?? NODE_WIDTH
        const nodeHeight = node.measured?.height ?? estimateNodeHeight(node)
        minX = Math.min(minX, node.position.x)
        minY = Math.min(minY, node.position.y)
        maxX = Math.max(maxX, node.position.x + nodeWidth)
        maxY = Math.max(maxY, node.position.y + nodeHeight)
      }
      const layoutCenterX = (minX + maxX) / 2
      const layoutCenterY = (minY + maxY) / 2

      // Offset all nodes to center in viewport
      const offsetX = center.x - layoutCenterX
      const offsetY = center.y - layoutCenterY

      // addNode captures history before each addition
      layoutedNodes.forEach((node) => {
        addNode({
          ...node,
          position: {
            x: node.position.x + offsetX,
            y: node.position.y + offsetY,
          },
        } as PlannerNode)
      })
      edgesToAdd.forEach((edge) => addEdge(edge))

      setNodeCounter((c) => c + layoutedNodes.length)
      setSelectedItemId(null)
      setItemsPerMinute('60')
    }
    runAutoLayout()
  }, [
    selectedItemId,
    itemsPerMinute,
    productionSummary,
    buildings,
    recipes,
    addNode,
    addEdge,
    getViewportCenter,
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
