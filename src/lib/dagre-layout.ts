import dagre from '@dagrejs/dagre'
import type { Edge, Node, Position } from '@xyflow/react'
import type { Recipe } from '@/types/planner'

export const NODE_WIDTH = 310

/**
 * Height breakdown (BuildingNode.tsx):
 * - Card padding + header + recipe selector: ~140px
 * - Each input/output badge: ~32px (Badge component + gap)
 *
 * Formula:
 * height = 140 + (recipe_inputs * 32) + (recipe_outputs * 32)
 *        + (custom_inputs * 32) + (custom_outputs * 32)
 */
export function estimateNodeHeight(node: Node, recipes?: Record<string, Recipe>): number {
  const data = node.data as Record<string, unknown>

  // Try to get recipe inputs/outputs from node data first (populated by parent)
  let recipeInputs = (data.recipeInputs as unknown[])?.length || 0
  let recipeOutputs = (data.recipeOutputs as unknown[])?.length || 0

  // If not on node data, look up recipe by recipeId
  if (recipeInputs === 0 && recipeOutputs === 0 && recipes) {
    const recipeId = data.recipeId as string
    const recipe = recipes[recipeId]
    if (recipe) {
      recipeInputs = recipe.inputs.length
      recipeOutputs = recipe.outputs.length
    }
  }

  // Custom inputs/outputs (user-added)
  const customInputs = (data.customInputs as unknown[])?.length || 0
  const customOutputs = (data.customOutputs as unknown[])?.length || 0

  const BASE_HEIGHT = 140 // card padding + header + recipe selector
  const BADGE_HEIGHT = 32 // each badge with gap

  return (
    BASE_HEIGHT +
    (recipeInputs + customInputs) * BADGE_HEIGHT +
    (recipeOutputs + customOutputs) * BADGE_HEIGHT
  )
}

export interface LayoutedElements {
  nodes: Node[]
  edges: Edge[]
}

export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: 'LR' | 'TB' = 'TB',
  recipes?: Record<string, Recipe>,
): LayoutedElements {
  // Create a NEW graph each time - this is the fix!
  const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))

  const isHorizontal = direction === 'LR'
  dagreGraph.setGraph({
    rankdir: direction,
    // nodesep: horizontal spacing between nodes in the same rank
    nodesep: 80,
    // ranksep: vertical spacing between ranks (columns in LR mode)
    // In LR mode, this controls vertical spacing between node columns
    ranksep: 100,
    align: 'UL', // left-align nodes within each rank
  })

  nodes.forEach((node) => {
    const width = node.measured?.width ?? NODE_WIDTH
    const height = node.measured?.height ?? estimateNodeHeight(node, recipes)
    dagreGraph.setNode(node.id, { width, height })
  })

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  const newNodes = nodes.map((node) => {
    const width = node.measured?.width ?? NODE_WIDTH
    const height = node.measured?.height ?? estimateNodeHeight(node, recipes)
    const nodeWithPosition = dagreGraph.node(node.id)

    return {
      ...node,
      targetPosition: (isHorizontal ? 'left' : 'top') as Position,
      sourcePosition: (isHorizontal ? 'right' : 'bottom') as Position,
      position: {
        x: nodeWithPosition.x - width / 2,
        y: nodeWithPosition.y - height / 2,
      },
    }
  })

  return { nodes: newNodes, edges }
}
