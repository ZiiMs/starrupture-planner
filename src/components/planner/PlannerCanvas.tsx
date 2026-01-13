'use client'

import { usePlannerData } from '@/hooks/use-planner-data'
import { calculateOutputRate } from '@/lib/calculations'
import { getLayoutedElements } from '@/lib/dagre-layout'
import {
  Background,
  ConnectionMode,
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
import { usePlannerStore } from '@/stores/planner-store'

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

// Helper to calculate edge efficiency data
function calculateEdgeEfficiencyData(
  edge: any,
  nodes: any[],
  recipes: Record<string, any>,
  buildings: Record<string, any>,
) {
  const sourceNode = nodes.find((n) => n.id === edge.source)
  const targetNode = nodes.find((n) => n.id === edge.target)

  if (!sourceNode || !targetNode) return null

  const sourceRecipe = recipes[sourceNode.data.recipeId]
  const targetRecipe = recipes[targetNode.data.recipeId]
  const sourceBuilding = buildings[sourceNode.data.buildingId]

  if (!sourceRecipe || !targetRecipe || !sourceBuilding) return null

  const itemId =
    edge.data?.itemId || edge.targetHandle?.replace('input-', '') || ''
  if (!itemId) return null

  const inputAmount =
    targetRecipe.inputs.find((i: any) => i.itemId === itemId)?.amount || 1
  const usageRate = (inputAmount / targetRecipe.time) * 60

  const sourceOutputAmount =
    sourceRecipe.outputs.find((o: any) => o.itemId === itemId)?.amount ||
    sourceRecipe.outputs[0]?.amount ||
    1
  const craftsPerSecond =
    (sourceNode.data.count * sourceBuilding.speed) / sourceRecipe.time
  const producerRate = craftsPerSecond * 60 * sourceOutputAmount

  return {
    itemId,
    usageRate,
    producerRate,
    isWarning: producerRate > usageRate,
    dataReady: true,
  }
}

function PlannerCanvasInner() {
  const { data: plannerData, isLoading } = usePlannerData()

  const [nodes, setNodes, onNodesChangeOrig] = useNodesState<any>([])
  const [edges, setEdges, onEdgesChangeOrig] = useEdgesState<any>([])
  const [isLayouted, setIsLayouted] = useState(false)

  const nodesInitialized = useNodesInitialized()
  const { getNodes, fitView } = useReactFlow()

  // Get pushToHistory from store
  const pushToHistory = usePlannerStore((state) => state.pushToHistory)

  // Sync undo/redo from store to local ReactFlow state
  const present = usePlannerStore((state) => state.present)
  const lastSyncedRef = useRef<{ nodes: any[] | null; edges: any[] | null }>({
    nodes: null,
    edges: null,
  })
  useEffect(() => {
    // Sync if present changed and local state hasn't caught up yet
    // Use JSON comparison for deep equality since arrays are reference types
    const nodesNeedSync =
      present.nodes &&
      lastSyncedRef.current.nodes !== present.nodes &&
      JSON.stringify(present.nodes) !== JSON.stringify(lastSyncedRef.current.nodes)

    const edgesNeedSync =
      present.edges &&
      lastSyncedRef.current.edges !== present.edges &&
      JSON.stringify(present.edges) !== JSON.stringify(lastSyncedRef.current.edges)

    if (nodesNeedSync) {
      setNodes(present.nodes)
      lastSyncedRef.current.nodes = present.nodes
    }
    if (edgesNeedSync) {
      setEdges(present.edges)
      lastSyncedRef.current.edges = present.edges
    }
  }, [present, setNodes, setEdges])

  // Wrap onNodesChange to capture history for meaningful changes
  const onNodesChange = useCallback(
    (changes: any[]) => {
      // Only capture history for non-selection, non-drag changes
      const meaningfulChanges = changes.filter(
        (change) =>
          change.type !== 'select' &&
          change.type !== 'dimensions' &&
          !(change.type === 'position' && !change.force),
      )
      if (meaningfulChanges.length > 0) {
        pushToHistory(nodes, edges)
      }
      onNodesChangeOrig(changes)
    },
    [nodes, edges, onNodesChangeOrig, pushToHistory],
  )

  // Wrap onEdgesChange to capture history for meaningful changes
  const onEdgesChange = useCallback(
    (changes: any[]) => {
      // Only capture history for non-selection changes
      const meaningfulChanges = changes.filter(
        (change) => change.type !== 'select',
      )
      if (meaningfulChanges.length > 0) {
        pushToHistory(nodes, edges)
      }
      onEdgesChangeOrig(changes)
    },
    [nodes, edges, onEdgesChangeOrig, pushToHistory],
  )

  const [menu, setMenu] = useState<{
    id: string | null
    top?: number
    left?: number
    right?: number
    bottom?: number
  } | null>(null)
  const reactFlowWrapper = useRef<HTMLDivElement>(null)

  // ALL HOOKS MUST BE DEFINED BEFORE ANY EARLY RETURNS
  const onConnect = useCallback(
    (params: any) => {
      // Capture history before adding edge
      pushToHistory(nodes, edges)

      const newEdge = {
        id: `efficiency-edge-${crypto.randomUUID()}`,
        ...params,
        type: 'efficiency-edge' as const,
        animated: true,
        data: {
          usageRate: 0,
          producerRate: 0,
          isWarning: false,
          dataReady: false,
        },
      }
      setEdges((eds) => {
        const updatedEdges = [...eds, newEdge]
        // Calculate edge data for all edges
        if (plannerData?.recipes && plannerData?.buildings) {
          updatedEdges.forEach((edge: any) => {
            const edgeData = calculateEdgeEfficiencyData(
              edge,
              nodes,
              plannerData.recipes,
              plannerData.buildings,
            )
            if (edgeData) {
              edge.data = { ...edge.data, ...edgeData }
            }
          })
        }
        return updatedEdges
      })
    },
    [setEdges, nodes, plannerData, pushToHistory, edges],
  )

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
      // Capture history before deleting
      pushToHistory(nodes, edges)

      setNodes((nds) => nds.filter((n: any) => n.id !== menu.id))
      setEdges((eds) =>
        eds.filter((e: any) => e.source !== menu.id && e.target !== menu.id),
      )
      setMenu(null)
    }
  }, [menu, setNodes, setEdges, pushToHistory, nodes, edges])

  const handleAddInputConnector = useCallback(() => {
    if (!menu?.id) return

    // Capture history before adding connector
    pushToHistory(nodes, edges)

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === menu.id) {
          const customInputs = [
            ...((node.data as any).customInputs || []),
            { id: `custom-input-${crypto.randomUUID()}` },
          ]
          return { ...node, data: { ...node.data, customInputs } }
        }
        return node
      }),
    )
    setMenu(null)
  }, [menu?.id, setNodes, pushToHistory, nodes, edges])

  const handleAddOutputConnector = useCallback(() => {
    if (!menu?.id) return

    // Capture history before adding connector
    pushToHistory(nodes, edges)

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === menu.id) {
          const customOutputs = [
            ...((node.data as any).customOutputs || []),
            { id: `custom-output-${crypto.randomUUID()}` },
          ]
          return { ...node, data: { ...node.data, customOutputs } }
        }
        return node
      }),
    )
    setMenu(null)
  }, [menu?.id, setNodes, pushToHistory, nodes, edges])

  const handleRemoveInputConnector = useCallback(
    (connectorId: string) => {
      if (!menu?.id) return

      // Capture history before removing connector
      pushToHistory(nodes, edges)

      // First, remove any edges connected to this handle
      setEdges((eds) =>
        eds.filter((edge) => {
          // Keep edge if it's NOT connected to the target handle
          return !(edge.target === menu.id && edge.targetHandle === connectorId)
        }),
      )

      // Then, remove the handle from customInputs
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === menu.id) {
            const customInputs = ((node.data as any).customInputs || []).filter(
              (input: any) => input.id !== connectorId,
            )
            return { ...node, data: { ...node.data, customInputs } }
          }
          return node
        }),
      )
      setMenu(null)
    },
    [menu?.id, setNodes, setEdges, pushToHistory, nodes, edges],
  )

  const handleRemoveOutputConnector = useCallback(
    (connectorId: string) => {
      if (!menu?.id) return

      // Capture history before removing connector
      pushToHistory(nodes, edges)

      // First, remove any edges connected to this handle
      setEdges((eds) =>
        eds.filter((edge) => {
          // Keep edge if it's NOT connected to the source handle
          return !(edge.source === menu.id && edge.sourceHandle === connectorId)
        }),
      )

      // Then, remove the handle from customOutputs
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === menu.id) {
            const customOutputs = (
              (node.data as any).customOutputs || []
            ).filter((output: any) => output.id !== connectorId)
            return { ...node, data: { ...node.data, customOutputs } }
          }
          return node
        }),
      )
      setMenu(null)
    },
    [menu?.id, setNodes, setEdges, pushToHistory, nodes, edges],
  )

  const handleDisconnect = useCallback(() => {
    if (!menu?.id) return

    // Capture history before disconnecting
    pushToHistory(nodes, edges)

    setEdges((eds) =>
      eds.filter(
        (edge) => edge.source !== menu.id && edge.target !== menu.id,
      ),
    )
    setMenu(null)
  }, [menu?.id, setEdges, pushToHistory, nodes, edges])

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

  // Auto-save to localStorage whenever nodes or edges change
  useEffect(() => {
    if (typeof window !== 'undefined' && nodes.length > 0) {
      localStorage.setItem(
        'starrupture-planner',
        JSON.stringify({ nodes, edges }),
      )
    }
  }, [nodes, edges])

  // Apply layout
  useEffect(() => {
    if (nodesInitialized && nodes.length > 0 && !isLayouted) {
      const { nodes: layoutedNodes, edges: layoutedEdges } =
        getLayoutedElements(getNodes(), edges, 'LR')
      setNodes(layoutedNodes)
      setEdges(layoutedEdges)
      setIsLayouted(true)
      setTimeout(() => fitView({ padding: 0.1 }), 100)
    }
  }, [
    nodesInitialized,
    nodes.length,
    isLayouted,
    getNodes,
    edges,
    setNodes,
    setEdges,
    fitView,
  ])

  // Calculate edge efficiency when nodes or planner data changes
  useEffect(() => {
    if (!plannerData?.recipes || !plannerData?.buildings || nodes.length === 0)
      return

    setEdges((eds) => {
      let hasChanges = false
      const updatedEdges = eds.map((edge: any) => {
        const edgeData = calculateEdgeEfficiencyData(
          edge,
          nodes,
          plannerData.recipes,
          plannerData.buildings,
        )
        if (edgeData) {
          const needsUpdate =
            edge.data?.itemId !== edgeData.itemId ||
            edge.data?.usageRate !== edgeData.usageRate ||
            edge.data?.producerRate !== edgeData.producerRate ||
            edge.data?.isWarning !== edgeData.isWarning
          if (needsUpdate) {
            hasChanges = true
            return { ...edge, data: { ...edge.data, ...edgeData } }
          }
        }
        return edge
      })
      return hasChanges ? updatedEdges : eds
    })
  }, [nodes, plannerData, setEdges])

  const handleRecipeChange = useCallback(
    (nodeId: string, newRecipeId: string) => {
      // Capture history before changing recipe
      pushToHistory(nodes, edges)

      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            const recipe = plannerData?.recipes[newRecipeId]
            const building = plannerData?.buildings[node.data.buildingId]
            if (!recipe || !building) return node

            return {
              ...node,
              data: {
                ...node.data,
                recipeId: newRecipeId,
                outputRate: calculateOutputRate(recipe, building, node.data.count || 1),
              },
            }
          }
          return node
        }),
      )
    },
    [plannerData, setNodes, pushToHistory, nodes, edges],
  )
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

  return (
    <div className="h-screen w-full relative" ref={reactFlowWrapper}>
      <div className="absolute left-4 top-4 z-10">
        <BuildingSelector
          buildings={plannerData.buildings}
          recipes={plannerData.recipes}
          items={plannerData.items}
          nodes={nodes}
          edges={edges}
          setNodes={setNodes}
          setEdges={setEdges}
          pushToHistory={pushToHistory}
        />
      </div>

      <ReactFlow
        connectionMode={ConnectionMode.Loose}
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
              onRecipeChange={handleRecipeChange}
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
        defaultEdgeOptions={{ animated: true }}
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
            onDisconnect={handleDisconnect}
            onAddInputConnector={handleAddInputConnector}
            onAddOutputConnector={handleAddOutputConnector}
            onRemoveInputConnector={handleRemoveInputConnector}
            onRemoveOutputConnector={handleRemoveOutputConnector}
            customInputs={
              (nodes.find((n) => n.id === menu.id)?.data as any)
                ?.customInputs || []
            }
            customOutputs={
              (nodes.find((n) => n.id === menu.id)?.data as any)
                ?.customOutputs || []
            }
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
