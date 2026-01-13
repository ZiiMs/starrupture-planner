'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'
import type { Building, Item, PlannerEdgeData, Recipe } from '@/types/planner'
import { Handle, NodeProps, Position, useEdges, useUpdateNodeInternals } from '@xyflow/react'
import { AlertTriangle } from 'lucide-react'
import { memo, useEffect, useMemo } from 'react'

interface BuildingNodeProps extends NodeProps {
  items: Record<string, Item>
  buildings: Record<string, Building>
  recipes: Record<string, Recipe>
  onRecipeChange?: (nodeId: string, newRecipeId: string) => void
}

function BuildingNodeComponent({
  id,  // Add this - React Flow passes node id as a prop
  data,
  selected,
  items,
  buildings,
  recipes,
  onRecipeChange,
}: BuildingNodeProps) {
  const edges = useEdges()
  const updateNodeInternals = useUpdateNodeInternals()
  const building = buildings[(data as any).buildingId]
  const recipe = recipes[(data as any).recipeId]

  // Debug: log every render
  console.log('BuildingNode render:', building?.name, '| Node ID:', id, '| Edges count:', edges.length)

  // Update node internals when custom inputs/outputs change (required for dynamic handles)
  useEffect(() => {
    if (id) {
      updateNodeInternals(id)
    }
  }, [id, (data as any).customInputs, (data as any).customOutputs, updateNodeInternals])

  const BuildingIcon = getIcon(building.icon)

  const availableRecipes = Object.values(recipes).filter((r) =>
    r.producers.includes((data as any).buildingId),
  )

const efficiencyWarnings = useMemo(() => {
  if (!id) return []

  const connectedEdges = edges.filter(
    (edge) => edge.source === id || edge.target === id
  )

  // Skip if any edge data isn't ready yet
  if (connectedEdges.some(edge => !(edge.data as PlannerEdgeData | undefined)?.dataReady)) {
    return []
  }

  const warnings: Array<{
    type: 'over' | 'under'
    itemName: string
    producerRate: number
    consumerRate: number
    itemId: string
  }> = []

  // Aggregate rates by itemId for outputs (where this node is producer)
  const outputTotals = new Map<string, { produced: number; consumed: number }>()
  
  // Aggregate rates by itemId for inputs (where this node is consumer)
  const inputTotals = new Map<string, { produced: number; needed: number }>()

  connectedEdges.forEach((edge) => {
    const edgeData = edge.data as PlannerEdgeData | undefined
    if (!edgeData?.dataReady || !edgeData.itemId) return

    const isProducer = edge.source === id

    if (isProducer) {
      // This node is producing - track total consumption of our output
      const current = outputTotals.get(edgeData.itemId) || { produced: edgeData.producerRate, consumed: 0 }
      current.consumed += edgeData.usageRate
      outputTotals.set(edgeData.itemId, current)
    } else {
      // This node is consuming - track total production feeding our input
      const current = inputTotals.get(edgeData.itemId) || { produced: 0, needed: edgeData.usageRate }
      current.produced += edgeData.producerRate
      inputTotals.set(edgeData.itemId, current)
    }
  })

  // Check output warnings (overproduction)
  outputTotals.forEach((totals, itemId) => {
    if (totals.produced > totals.consumed) {
      const item = items[itemId]
      warnings.push({
        type: 'over',
        itemName: item?.name || itemId,
        producerRate: totals.produced,
        consumerRate: totals.consumed,
        itemId,
      })
    }
  })

  // Check input warnings (underproduction / starving)
  inputTotals.forEach((totals, itemId) => {
    if (totals.produced < totals.needed) {
      const item = items[itemId]
      warnings.push({
        type: 'under',
        itemName: item?.name || itemId,
        producerRate: totals.produced,
        consumerRate: totals.needed,
        itemId,
      })
    }
  })

  return warnings
}, [id, edges, items])

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
              className="bg-primary! border-primary-foreground!"
            />
          )
        })}

        {((data as any).customInputs || []).map(
          (customInput: any, index: number) => {
            const yPos =
              ((index + recipe.inputs.length + 1) /
                (recipe.inputs.length +
                  ((data as any).customInputs?.length || 0) +
                  1)) *
              100
            return (
              <Handle
                key={customInput.id}
                type="target"
                position={Position.Left}
                id={String(customInput.id)}
                style={{ top: `${yPos}%` }}
                className="bg-secondary! border-secondary-foreground!"
              />
            )
          },
        )}

        {recipe.outputs.map((output, index) => {
          const yPos = ((index + 1) / (recipe.outputs.length + 1)) * 100
          return (
            <Handle
              key={`output-${output.itemId}`}
              type="source"
              position={Position.Right}
              id={`output-${output.itemId}`}
              style={{ top: `${yPos}%` }}
              className="bg-primary! border-primary-foreground!"
            />
          )
        })}

        {((data as any).customOutputs || []).map(
          (customOutput: any, index: number) => {
            const yPos =
              ((index + recipe.outputs.length + 1) /
                (recipe.outputs.length +
                  ((data as any).customOutputs?.length || 0) +
                  1)) *
              100
            return (
              <Handle
                key={customOutput.id}
                type="source"
                position={Position.Right}
                id={String(customOutput.id)}
                style={{ top: `${yPos}%` }}
                className="bg-secondary! border-secondary-foreground!"
              />
            )
          },
        )}

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
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-foreground">
                {building.name}
              </h3>
              {efficiencyWarnings.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertTriangle className="w-4 h-4 text-amber-500 cursor-help flex-shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    {efficiencyWarnings.map((warning, index) => (
                      <p key={index} className="text-xs mb-1 last:mb-0">
                        {warning.type === 'over' ? (
                          <>Producing {Math.round(warning.producerRate)}/min of {warning.itemName} but only using {Math.round(warning.consumerRate)}/min</>
                        ) : (
                          <>Producing {Math.round(warning.producerRate)}/min of {warning.itemName} but needs {Math.round(warning.consumerRate)}/min</>
                        )}
                      </p>
                    ))}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
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
          <Select
            value={(data as any).recipeId}
            onValueChange={(value) => onRecipeChange?.((data as any).id, value)}
          >
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
