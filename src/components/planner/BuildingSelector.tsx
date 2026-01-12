'use client'

import { memo } from 'react'
import { useReactFlow } from '@xyflow/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import type { Building, Recipe } from '@/types/planner'
import {
  calculateOutputRate,
  calculatePowerConsumption,
} from '@/lib/calculations'
import { nanoid } from 'nanoid'
import { getIcon } from '@/lib/icons'

interface BuildingSelectorProps {
  buildings: Record<string, Building>
  recipes: Record<string, Recipe>
}

function BuildingSelectorComponent({
  buildings,
  recipes,
}: BuildingSelectorProps) {
  const { addNodes } = useReactFlow()

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

  const categories = Array.from(
    new Set(Object.values(buildings).map((b) => b.category)),
  )

  return (
    <Card className="w-64">
      <CardHeader>
        <CardTitle className="text-sm">Buildings</CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  )
}

export default memo(BuildingSelectorComponent)
