import type { Node, Edge } from '@xyflow/react'

export interface Item {
  id: string
  name: string
  category: string
  description?: string
  icon: string
  iconColor?: string
}

export interface Building {
  id: string
  name: string
  category: string
  speed: number
  powerUsage: number
  powerDrain: number
  size: { width: number; height: number }
  icon: string
  iconColor?: string
}

export interface RecipeInput {
  itemId: string
  amount: number
}

export interface RecipeOutput {
  itemId: string
  amount: number
}

export interface Recipe {
  id: string
  name: string
  category: string
  time: number
  inputs: RecipeInput[]
  outputs: RecipeOutput[]
  producers: string[]
  outputRate: number
}

export interface Corporation {
  id: string
  name: string
  description?: string
}

export interface PlannerNodeData extends Record<string, unknown> {
  buildingId: string
  recipeId: string
  count: number
  outputRate: number
  powerConsumption: number
  targetRate?: number // User-set target rate for output nodes
}

export type PlannerNode = Node<PlannerNodeData, 'planner-node'>

export interface PlannerEdgeData extends Record<string, unknown> {
  itemId: string
  amount: number
  usageRate: number
  producerRate: number
  efficiencyRatio?: number
  isWarning?: boolean
}

export type PlannerEdge = Edge<PlannerEdgeData>

export interface HistoryState {
  past: Array<{ nodes: PlannerNode[]; edges: PlannerEdge[] }>
  present: { nodes: PlannerNode[]; edges: PlannerEdge[] }
  future: Array<{ nodes: PlannerNode[]; edges: PlannerEdge[] }>
}
