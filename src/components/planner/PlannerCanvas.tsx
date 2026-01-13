'use client'

import { usePlannerData } from '@/hooks/use-planner-data'
import { getLayoutedElements } from '@/lib/dagre-layout'
import {
  Background,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { BuildingNode } from './BuildingNode'
import BuildingSelector from './BuildingSelector'
import Controls from './Controls'
import { EfficiencyEdge } from './EfficiencyEdge'
import Minimap from './Minimap'
import { NodeContextMenu } from './NodeContextMenu'

interface EnhancedBuildingNodeProps {
  items: Record<string, any>
  buildings: Record<string, any>
  recipes: Record<string, any>
}

const EnhancedBuildingNode = memo(
  ({
    items,
    buildings,
    recipes,
    ...props
  }: EnhancedBuildingNodeProps & any) => (
    <BuildingNode
      {...props}
      items={items}
      buildings={buildings}
      recipes={recipes}
    />
  ),
)

EnhancedBuildingNode.displayName = 'EnhancedBuildingNode'

function PlannerCanvasInner() {
  const { data: plannerData, isLoading } = usePlannerData()

  const [nodes, setNodes, onNodesChange] = useNodesState<any>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([])
  const [isLayouted, setIsLayouted] = useState(false)

  const nodesInitialized = useNodesInitialized()
  const { getNodes, fitView } = useReactFlow()

  const [menu, setMenu] = useState<{
    id: string | null
    top?: number
    left?: number
    right?: number
    bottom?: number
  } | null>(null)
  const reactFlowWrapper = useRef<HTMLDivElement>(null)

  // Early returns MUST be after all hooks
  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <span className="text-muted-foreground">Loading...</span>
      </div>
    )
  }

  if (!plannerData) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <span className="text-muted-foreground">No data</span>
      </div>
    )
  }

  const onConnect = useCallback((params: any) => {
    const newEdge = {
      ...params,
      type: 'efficiency-edge' as const,
      animated: true,
      data: { usageRate: 0, producerRate: 0, isWarning: false, dataReady: false },
    }
    setEdges((eds) => [...eds, newEdge])
  }, [setEdges])

  const onPaneClick = useCallback(() => setMenu(null), [])
  const onNodeClick = useCallback(() => setMenu(null), [])

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: any) => {
      event.preventDefault()
      const rect = (event.target as Element).getBoundingClientRect()
      setMenu({ id: node.id, top: rect.top + 4, left: rect.right + 4 })
    },
    [],
  )

  const handleDeleteNode = useCallback(() => {
    if (menu?.id) {
      setNodes((nds) => nds.filter((n: any) => n.id !== menu.id))
      setEdges((eds) => eds.filter((e: any) => e.source !== menu.id && e.target !== menu.id))
      setMenu(null)
    }
  }, [menu, setNodes, setEdges])

  // Load saved data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('starrupture-planner')
      if (saved) {
        try {
          const loaded = JSON.parse(saved)
          if (loaded?.nodes?.length > 0) {
            setNodes(loaded.nodes)
            setEdges(loaded.edges)
          }
        } catch (e) {}
      }
    }
  }, [setNodes, setEdges])

  // Apply layout
  useEffect(() => {
    if (nodesInitialized && nodes.length > 0 && !isLayouted) {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        getNodes(),
        edges,
        'LR'
      )
      setNodes(layoutedNodes)
      setEdges(layoutedEdges)
      setIsLayouted(true)
      setTimeout(() => fitView({ padding: 0.1 }), 100)
    }
  }, [nodesInitialized, nodes.length, isLayouted, getNodes, edges, setNodes, setEdges, fitView])

  return (
    <div className="h-screen w-full relative" ref={reactFlowWrapper}>
      <div className="absolute left-4 top-4 z-10">
        <BuildingSelector
          buildings={plannerData.buildings}
          recipes={plannerData.recipes}
          items={plannerData.items}
        />
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        onNodeClick={onNodeClick}
        nodeTypes={{
          'planner-node': (props: any) => (
            <EnhancedBuildingNode
              {...props}
              items={plannerData.items}
              buildings={plannerData.buildings}
              recipes={plannerData.recipes}
            />
          ),
        }}
        edgeTypes={{
          'efficiency-edge': (props: any) => (
            <EfficiencyEdge
              {...props}
              recipes={plannerData.recipes}
              buildings={plannerData.buildings}
            />
          ),
        }}
        fitView
        className="bg-background"
        defaultEdgeOptions={{ type: 'smoothstep', animated: true }}
      >
        <Background />
        <Controls />
        <Minimap />
        {menu && (
          <NodeContextMenu
            onClick={onPaneClick}
            top={menu.top!}
            left={menu.left!}
            right={menu.right}
            bottom={menu.bottom}
            onDeleteNode={handleDeleteNode}
            onAddInputConnector={() => {}}
            onAddOutputConnector={() => {}}
          />
        )}
      </ReactFlow>
    </div>
  )
}

function PlannerCanvas() {
  return (
    <ReactFlowProvider>
      <PlannerCanvasInner />
    </ReactFlowProvider>
  )
}

export default PlannerCanvas
