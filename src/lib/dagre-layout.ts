import dagre from '@dagrejs/dagre'
import type { Edge, Node, Position } from '@xyflow/react'

const nodeWidth = 310

function estimateNodeHeight(node: Node): number {
  const baseHeight = 200
  const data = node.data as any
  // Use customInputs/customOutputs which are the actual property names
  const inputCount = data.customInputs?.length || 0
  const outputCount = data.customOutputs?.length || 0
  const badgeCount = inputCount + outputCount
  return baseHeight + badgeCount * 40
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
    nodesep: 60,
    ranksep: 120,
  })

  nodes.forEach((node) => {
    const width = node.measured?.width ?? nodeWidth
    const height = node.measured?.height ?? estimateNodeHeight(node)
    dagreGraph.setNode(node.id, { width, height })
  })

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  const newNodes = nodes.map((node) => {
    const width = node.measured?.width ?? nodeWidth
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
