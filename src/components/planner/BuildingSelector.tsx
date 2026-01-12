'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePlannerData, type PlannerData } from '@/hooks/use-planner-data'
import {
  calculateOutputRate,
  calculatePowerConsumption,
} from '@/lib/calculations'
import { getIcon } from '@/lib/icons'
import type { Building, Item, Recipe } from '@/types/planner'
import { useReactFlow } from '@xyflow/react'
import { nanoid } from 'nanoid'
import { memo, useState } from 'react'

function BuildingSelectorComponent() {
  const { addNodes } = useReactFlow()
  const data = usePlannerData()
  const [activeTab, setActiveTab] = useState<'buildings' | 'items'>('buildings')
  const [nodeCounter, setNodeCounter] = useState(0)

  const addBuildingNode = (buildingId: string) => {
    const building = data.buildings[buildingId]
    const firstRecipe = Object.values(data.recipes).find((r) =>
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

  const addChainFromItem = (itemId: string, data: PlannerData) => {
    const item = data.items[itemId]
    const recipesProducingItem = Object.values(data.recipes).filter((r) =>
      r.outputs.some((o) => o.itemId === itemId),
    )

    if (recipesProducingItem.length === 0) {
      console.error(`No recipes found that produce item: ${itemId}`)
      return
    }

    const nodesToAdd = []
    let positionCounter = nodeCounter

    for (const recipe of recipesProducingItem) {
      const building = data.buildings[recipe.producers[0]]
      if (!building) continue

      const outputRate = calculateOutputRate(recipe, building, 1)
      const powerConsumption = calculatePowerConsumption(building, 1)

      nodesToAdd.push({
        id: nanoid(),
        type: 'planner-node',
        position: {
          x: 200 + (positionCounter % 3) * 350,
          y: 300 + Math.floor(positionCounter / 3) * 250,
        },
        data: {
          buildingId: building.id,
          recipeId: recipe.id,
          count: 1,
          outputRate,
          powerConsumption,
        },
      })

      positionCounter += 1
    }

    addNodes(nodesToAdd)
    setNodeCounter((c) => c + nodesToAdd.length)
  }

  const categories = Array.from(
    new Set(Object.values(data.buildings).map((b) => b.category)),
  )
  const itemCategories = Array.from(
    new Set(Object.values(data.items).map((i) => i.category)),
  )

  return (
    <Card className="w-72">
      <CardHeader>
        <CardTitle className="text-sm">Add Elements</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
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
                    {Object.values(data.buildings)
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
                    {Object.values(data.items) // Changed from 'items' to 'data.items'
                      .filter((i) => i.category === category)
                      .map((item) => {
                        const ItemIcon = getIcon(item.icon)
                        return (
                          <Button
                            key={item.id}
                            variant="outline"
                            onClick={() => addChainFromItem(item.id, data)} // Changed to just pass 'data'
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
