'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  calculateOutputRate,
  calculatePowerConsumption,
} from '@/lib/calculations'
import { getIcon } from '@/lib/icons'
import type { Building, Item, Recipe } from '@/types/planner'
import { useReactFlow } from '@xyflow/react'
import { nanoid } from 'nanoid'
import { memo, useState } from 'react'
import type { Edge, Node } from '@xyflow/react'

interface BuildingSelectorProps {
  buildings: Record<string, Building>
  recipes: Record<string, Recipe>
  items: Record<string, Item>
}

function BuildingSelectorComponent({
  buildings,
  recipes,
  items,
}: BuildingSelectorProps) {
  const { addNodes, addEdges } = useReactFlow()
  const [activeTab, setActiveTab] = useState<'buildings' | 'items'>('buildings')
  const [nodeCounter, setNodeCounter] = useState(0)

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

  const addChainFromItem = (itemId: string) => {
    const nodesToAdd: Node[] = []
    const edgesToAdd: Edge[] = []
    const visitedRecipes = new Set<string>()
    const levelCounts = new Map<number, number>()
    const nodeRecipeMap = new Map<string, Recipe>()

    const buildProductionChain = (
      targetItemId: string,
      level: number = 0,
      parentNodeId?: string,
      inputItemId?: string,
    ): void => {
      if (level > 10) return

      const recipesProducingItem = Object.values(recipes).filter((r) =>
        r.outputs.some((o) => o.itemId === targetItemId),
      )

      if (recipesProducingItem.length === 0) return

      const countAtLevel = levelCounts.get(level) || 0

      for (const recipe of recipesProducingItem) {
        const recipeKey = `${recipe.id}-${level}`
        if (visitedRecipes.has(recipeKey)) continue
        visitedRecipes.add(recipeKey)

        const building = buildings[recipe.producers[0]]
        if (!building) continue

        const outputRate = calculateOutputRate(recipe, building, 1)
        const powerConsumption = calculatePowerConsumption(building, 1)

        const nodeId = nanoid()
        nodeRecipeMap.set(nodeId, recipe)

        const x = 1200 - level * 350
        const y = 200 + countAtLevel * 250

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

        if (parentNodeId && inputItemId) {
          const consumerRecipe = nodeRecipeMap.get(parentNodeId)
          const producerRate = outputRate

          let usageRate = 0
          let isWarning = false

          if (consumerRecipe && consumerRecipe.time > 0) {
            const inputAmount = consumerRecipe.inputs.find(
              (i) => i.itemId === inputItemId,
            )?.amount || 1

            usageRate = (inputAmount / consumerRecipe.time) * 60
            isWarning = producerRate > usageRate
          }

          edgesToAdd.push({
            id: nanoid(),
            source: nodeId,
            target: parentNodeId,
            type: 'smoothstep',
            animated: true,
            label: `${Math.round(usageRate)}/min`,
            labelStyle: {
              fontSize: 10,
              color: isWarning ? '#ef4444' : '#000',
              fontWeight: isWarning ? 'bold' : 'normal',
            },
            labelBgStyle: {
              fill: isWarning ? '#fef2f2' : '#fff',
            },
            data: {
              itemId: inputItemId,
              amount: 1,
              usageRate,
              isWarning,
            },
          })
        }

        levelCounts.set(level, countAtLevel + 1)

        for (const input of recipe.inputs) {
          buildProductionChain(input.itemId, level + 1, nodeId, input.itemId)
        }
      }
    }

    buildProductionChain(itemId, 0)

    if (nodesToAdd.length > 0) {
      addNodes(nodesToAdd)
      addEdges(edgesToAdd)
      setNodeCounter((c) => c + nodesToAdd.length)
    }
  }

  const categories = Array.from(
    new Set(Object.values(buildings).map((b) => b.category)),
  )
  const itemCategories = Array.from(
    new Set(Object.values(items).map((i) => i.category)),
  )

  return (
    <Card className="w-72">
      <CardHeader>
        <CardTitle className="text-sm">Add Elements</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'buildings' | 'items')}
        >
          <TabsList className="w-full">
            <TabsTrigger value="buildings">Buildings</TabsTrigger>
            <TabsTrigger value="items">Items</TabsTrigger>
          </TabsList>

          <TabsContent value="buildings">
            <ScrollArea className="h-[400px]">
              {categories.map((category) => (
                <div key={category} className="mb-4">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2 capitalize">
                    {category}
                  </h4>
                  <div className="flex flex-col gap-2">
                    {Object.values(buildings)
                      .filter((b) => b.category === category)
                      .map((building) => {
                        const BuildingIcon = getIcon(building.icon)
                        return (
                          <Button
                            key={building.id}
                            variant="ghost"
                            size="sm"
                            onClick={() => addBuildingNode(building.id)}
                            className="justify-start gap-2 h-auto py-2"
                          >
                            <div
                              className="w-6 h-6 rounded-sm flex items-center justify-center bg-accent"
                              style={{
                                color:
                                  building.iconColor || 'var(--foreground)',
                              }}
                            >
                              <BuildingIcon className="w-4 h-4" />
                            </div>
                            <span className="text-xs">{building.name}</span>
                          </Button>
                        )
                      })}
                  </div>
                </div>
              ))}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="items">
            <ScrollArea className="h-[400px]">
              {itemCategories.map((category) => (
                <div key={category} className="mb-4">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2 capitalize">
                    {category}
                  </h4>
                  <div className="flex flex-col gap-2">
                    {Object.values(items)
                      .filter((i) => i.category === category)
                      .map((item) => {
                        const ItemIcon = getIcon(item.icon)
                        return (
                          <Button
                            key={item.id}
                            variant="outline"
                            onClick={() => addChainFromItem(item.id)}
                            className="justify-start gap-2 h-auto py-2"
                            title={`Click to add ${item.name} production chain`}
                          >
                            <ItemIcon className="h-4 w-4" />
                            {item.name}
                          </Button>
                        )
                      })}
                  </div>
                </div>
              ))}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

export default memo(BuildingSelectorComponent)
