'use client'

import { memo, useMemo } from 'react'
import {
  BaseEdge,
  getSmoothStepPath,
  Position,
} from '@xyflow/react'
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
  style,
  markerEnd,
}: EfficiencyEdgeProps) {
  const [edgePath] = useMemo(
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

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={style}
      markerEnd={markerEnd}
    />
  )
}

export const EfficiencyEdge = memo(EfficiencyEdgeComponent)
