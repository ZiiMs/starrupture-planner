import dagre from '@dagrejs/dagre'
import type { Edge, Node, Position } from '@xyflow/react'

const NODE_WIDTH = 310

/**
 * Estimates node height based on actual BuildingNode rendering.
 *
 * Height breakdown (BuildingNode.tsx):
 * - Card padding + header + recipe selector: ~140px
 * - Each input/output badge: ~32px (Badge component + gap)
 * - Separator: ~12px (between sections)
 *
 * Formula:
 * height = 140 + (recipe_inputs * 32) + (recipe_outputs * 32)
 *        + (custom_inputs * 32) + (custom_outputs * 32)
 */
function estimateNodeHeight(node: Node): number {
  const data = node.data as Record<string, unknown>

  // Recipe inputs/outputs (from recipe data referenced in node)
  const recipeInputs = (data.recipeInputs as unknown[])?.length || 0
  const recipeOutputs = (data.recipeOutputs as unknown[])?.length || 0

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
): LayoutedElements {
  // Create a NEW graph each time - this is the fix!
  const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))

  const isHorizontal = direction === 'LR'
  dagreGraph.setGraph({
    rankdir: direction,
    // nodesep: horizontal spacing between nodes in the same rank
    nodesep: 80,
    // ranksep: vertical spacing between ranks (must be >= max node height)
    // Our nodes range from ~200px to ~344px, so 360px ensures no overlap
    ranksep: 360,
    align: 'UL', // left-align nodes within each rank
  })

  nodes.forEach((node) => {
    const width = node.measured?.width ?? NODE_WIDTH
    const height = node.measured?.height ?? estimateNodeHeight(node)
    dagreGraph.setNode(node.id, { width, height })
  })

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  const newNodes = nodes.map((node) => {
    const width = node.measured?.width ?? NODE_WIDTH
    const height = node.measured?.height ?? estimateNodeHeight(node)
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
