'use client'

import { memo } from 'react'
import { useReactFlow } from '@xyflow/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Building, Recipe, Item } from '@/types/planner'
import { calculateOutputRate, calculatePowerConsumption } from '@/lib/calculations'
import { nanoid } from 'nanoid'
import { getIcon } from '@/lib/icons'
import { useState } from 'react'
import { usePlannerData } from '@/hooks/use-planner-data'

interface PlannerDataProps {
  buildings: Record<string, Building>
  recipes: Record<string, Recipe>
}

function PlannerDataComponent({
  buildings,
  recipes,
}: PlannerDataProps) {
  const { addNodes } = useReactFlow()
  const [activeTab, setActiveTab] = useState<'buildings' | 'items'>('buildings')

  const addBuildingNode = (buildingId: string) => {
    const building = buildings[buildingId]
    const firstRecipe = Object.values(recipes).find(r =>
      r.producers.includes(buildingId)
    )

    if (!firstRecipe) {
      console.error(`No recipe found for building: ${buildingId}`)
      return
    }

    const outputRate = calculateOutputRate(firstRecipe, building, 1)
    const powerConsumption = calculatePowerConsumption(building, 1)

    addNodes({
      id: nanoid(),
      type: 'planner-node',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: {
        buildingId,
        recipeId: firstRecipe.id,
        count: 1,
        outputRate,
        powerConsumption,
      },
    })
  }

  const addChainFromItem = (itemId: string, items: Record<string, Item>, buildings: Record<string, Building>, recipes: Record<string, Recipe>) => {
    const item = items[itemId]
    const recipesProducingItem = Object.values(recipes).filter(r =>
      r.outputs.some(o => o.itemId === itemId)
    )

    if (recipesProducingItem.length === 0) {
      console.error(`No recipes found that produce item: ${itemId}`)
      return
    }

    const nodesToAdd = []
    let currentPosition = { x: 200, y: 300 }

    for (const recipe of recipesProducingItem) {
      const building = buildings[recipe.producers[0]]
      if (!building) continue

      const outputRate = calculateOutputRate(recipe, building, 1)
      const powerConsumption = calculatePowerConsumption(building, 1)

      nodesToAdd.push({
        id: nanoid(),
        type: 'planner-node',
        position: { ...currentPosition },
        data: {
          buildingId: building.id,
          recipeId: recipe.id,
          count: 1,
          outputRate,
          powerConsumption,
        },
      })

      currentPosition.x += 350
      if (currentPosition.x > 800) {
        currentPosition.x = 200
        currentPosition.y += 250
      }
    }

    addNodes(nodesToAdd)
  }

  const categories = Array.from(
    new Set(Object.values(buildings).map(b => b.category))
  )

  const itemCategories = Array.from(
    new Set(Object.values(items).map(i => i.category))
  )

  return (
    <Card className="w-72">
      <CardHeader>
        <CardTitle className="text-sm">Add Elements</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="buildings">
              Buildings
            </TabsTrigger>
            <TabsTrigger value="items">
              Items
            </TabsTrigger>
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
                      .filter(b => b.category === category)
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
                                color: building.iconColor || 'var(--foreground)',
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
                      .filter(i => i.category === category)
                      .map((item) => (
                        const ItemIcon = getIcon(item.icon)
                        return (
                          <Button
                            key={item.id}
                            variant="ghost"
                            size="sm"
                            onClick={() => addChainFromItem(item.id, items, buildings, recipes)}
                            className="justify-start gap-2 h-auto py-2"
                            title={`Click to add ${item.name} production chain`}
                          >
                            <div
                              className="w-6 h-6 rounded-sm flex items-center justify-center bg-accent"
                              style={{
                                color: item.iconColor || 'var(--foreground)',
                              }}
                            >
                              <ItemIcon className="w-4 h-4" />
                            </div>
                            <span className="text-xs">{item.name}</span>
                          </Button>
                        )
                      )}
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

export default memo(PlannerDataComponent)
