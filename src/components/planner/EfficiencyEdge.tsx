'use client'

import { memo, useMemo } from 'react'
import { BaseEdge, getSmoothStepPath, Position } from '@xyflow/react'
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
  markerStart?: string
  data?: PlannerEdgeData
  recipes?: Record<string, Recipe>
  buildings?: Record<string, Building>
  label?: string
  labelStyle?: React.CSSProperties
  labelShowBg?: boolean
  labelBgStyle?: React.CSSProperties
  labelBgPadding?: [number, number]
  labelBgBorderRadius?: number
  interactionWidth?: number
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
  markerStart,
  label,
  labelStyle,
  labelShowBg,
  labelBgStyle,
  labelBgPadding,
  labelBgBorderRadius,
  interactionWidth,
}: EfficiencyEdgeProps) {
  const [edgePath] = useMemo(
    () =>
      getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
      }),
    [sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition],
  )

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={style}
      markerEnd={markerEnd}
      markerStart={markerStart}
      label={label}
      labelStyle={labelStyle}
      labelShowBg={labelShowBg}
      labelBgStyle={labelBgStyle}
      labelBgPadding={labelBgPadding}
      labelBgBorderRadius={labelBgBorderRadius}
      interactionWidth={interactionWidth}
    />
  )
}

export const EfficiencyEdge = memo(EfficiencyEdgeComponent)
