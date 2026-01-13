'use client'

import { memo, useMemo } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useReactFlow,
  Position,
} from '@xyflow/react'
import { cn } from '@/lib/utils'
import type { PlannerEdgeData, Recipe, Building } from '@/types/planner'

interface EfficiencyEdgeProps {
  id: string
  source: string
  target: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  sourcePosition?: Position
  targetPosition?: Position
  style?: React.CSSProperties
  markerEnd?: string
  data?: PlannerEdgeData
  recipes?: Record<string, Recipe>
  buildings?: Record<string, Building>
}

function EfficiencyEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition = Position.Right,
  targetPosition = Position.Left,
  data,
  style,
  markerEnd,
  recipes,
  buildings,
}: EfficiencyEdgeProps) {
  const { getNode } = useReactFlow()

  const [edgePath, labelX, labelY] = useMemo(
    () => getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    }),
    [sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition]
  )

  const sourceNode = data?.sourceNodeId ? getNode(String(data.sourceNodeId)) : null
  const targetNode = data?.targetNodeId ? getNode(String(data.targetNodeId)) : null

  const { label, isWarning } = useMemo(() => {
    if (!data) {
      return { label: '0/min', isWarning: false }
    }

    const itemId = data.itemId
    if (!itemId) {
      const usage = data.usageRate || 0
      const producer = data.producerRate || 0
      const warning = data.isWarning || producer > usage
      const labelText = data.producerRate
        ? `${Math.round(producer)}/${Math.round(usage)}/min`
        : `${Math.round(usage)}/min`
      return { label: labelText, isWarning: warning }
    }

    if (sourceNode && targetNode) {
      const sourceData = sourceNode.data as Record<string, unknown>
      const targetData = targetNode.data as Record<string, unknown>

      const recipesMap = recipes || {}
      const buildingsMap = buildings || {}

      const sourceRecipe = recipesMap[String(sourceData.recipeId)]
      const targetRecipe = recipesMap[String(targetData.recipeId)]
      const sourceBuilding = buildingsMap[String(sourceData.buildingId)]

      if (sourceRecipe && targetRecipe && sourceBuilding) {
        const inputAmount =
          targetRecipe.inputs.find((i) => i.itemId === itemId)?.amount || 1
        const usage = (inputAmount / targetRecipe.time) * 60

        const craftsPerSecond = ((sourceData.count as number) * sourceBuilding.speed) / sourceRecipe.time
        const producer = craftsPerSecond * 60 * (sourceRecipe.outputs[0]?.amount || 1)

        const warning = producer > usage
        const labelText = `${Math.round(producer)}/${Math.round(usage)}/min`

        return { label: labelText, isWarning: warning }
      }
    }

    const usage = data.usageRate || 0
    const producer = data.producerRate || 0
    const warning = data.isWarning || producer > usage
    const labelText = data.producerRate
      ? `${Math.round(producer)}/${Math.round(usage)}/min`
      : `${Math.round(usage)}/min`

    return { label: labelText, isWarning: warning }
  }, [data, sourceNode, targetNode, recipes, buildings])

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={style}
        markerEnd={markerEnd}
      />
      <EdgeLabelRenderer>
        <div
          className={cn(
            'nodrag nopan absolute flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-sm transition-colors',
            isWarning
              ? 'bg-red-50 text-red-600 border border-red-200'
              : 'bg-background text-foreground border border-border'
          )}
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
        >
          {label}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

export const EfficiencyEdge = memo(EfficiencyEdgeComponent)
