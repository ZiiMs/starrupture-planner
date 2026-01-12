'use client'

import { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Building, Recipe, Item } from '@/types/planner'
import { getIcon } from '@/lib/icons'

interface BuildingNodeProps extends NodeProps {
  items: Record<string, Item>
  buildings: Record<string, Building>
  recipes: Record<string, Recipe>
}

function BuildingNodeComponent({
  data,
  selected,
  items,
  buildings,
  recipes,
}: BuildingNodeProps) {
  const building = buildings[(data as any).buildingId]
  const recipe = recipes[(data as any).recipeId]

  const BuildingIcon = getIcon(building.icon)

  const availableRecipes = Object.values(recipes).filter((r) =>
    r.producers.includes((data as any).buildingId),
  )

  return (
    <Card
      className={cn(
        'min-w-[300px] max-w-[320px]',
        selected && 'ring-2 ring-primary',
      )}
      data-node-id={data.id}
    >
      <CardContent className="p-3">
        {recipe.inputs.map((input, index) => {
          const yPos = ((index + 1) / (recipe.inputs.length + 1)) * 100
          return (
            <Handle
              key={`input-${input.itemId}`}
              type="target"
              position={Position.Left}
              id={`input-${input.itemId}`}
              style={{ top: `${yPos}%` }}
              className="!bg-primary !border-primary-foreground"
            />
          )
        })}

        {recipe.outputs.map((output, index) => {
          const yPos = ((index + 1) / (recipe.outputs.length + 1)) * 100
          return (
            <Handle
              key={`output-${output.itemId}`}
              type="source"
              position={Position.Right}
              id={`output-${output.itemId}`}
              style={{ top: `${yPos}%` }}
              className="!bg-primary !border-primary-foreground"
            />
          )
        })}

        <div className="flex items-start gap-3 mb-2">
          <div className="flex-shrink-0">
            <div
              className="w-12 h-12 rounded-md border border-border flex items-center justify-center bg-card"
              style={{ color: building.iconColor || 'var(--foreground)' }}
            >
              <BuildingIcon className="w-6 h-6" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-foreground mb-1">
              {building.name}
            </h3>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <span className="font-medium">Power:</span>
                <span>{(data as any).powerConsumption.toFixed(0)} kW</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-medium">Output:</span>
                <span>{(data as any).outputRate.toFixed(1)}/min</span>
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-3" />

        <div className="mb-3">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Recipe
          </label>
          <Select value={(data as any).recipeId}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select recipe" />
            </SelectTrigger>
            <SelectContent>
              {availableRecipes.map((r) => (
                <SelectItem key={r.id} value={r.id} className="text-xs">
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {recipe.inputs.length > 0 && (
          <div className="mb-2">
            <div className="text-xs font-medium text-muted-foreground mb-1">
              Inputs
            </div>
            <div className="flex gap-2 flex-wrap">
              {recipe.inputs.map((input) => {
                const item = items[input.itemId]
                const ItemIcon = getIcon(item.icon)
                return (
                  <Badge
                    key={input.itemId}
                    variant="outline"
                    className="h-7 px-2 gap-1.5 text-xs"
                  >
                    <ItemIcon
                      className="w-3.5 h-3.5"
                      style={{ color: item.iconColor }}
                    />
                    <span>{item.name}</span>
                  </Badge>
                )
              })}
            </div>
          </div>
        )}

        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1">
            Outputs
          </div>
          <div className="flex gap-2 flex-wrap">
            {recipe.outputs.map((output) => {
              const item = items[output.itemId]
              const ItemIcon = getIcon(item.icon)
              return (
                <Badge
                  key={output.itemId}
                  variant="secondary"
                  className="h-7 px-2 gap-1.5 text-xs"
                >
                  <ItemIcon
                    className="w-3.5 h-3.5"
                    style={{ color: item.iconColor }}
                  />
                  <span>{item.name}</span>
                </Badge>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export const BuildingNode = memo(BuildingNodeComponent)
