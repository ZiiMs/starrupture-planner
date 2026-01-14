'use client'

import { usePlannerData } from '@/hooks/use-planner-data'
import { calculateOutputRate } from '@/lib/calculations'
import { getLayoutedElements } from '@/lib/dagre-layout'
import {
  Background,
  ConnectionMode,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useReactFlow,
  type NodeChange,
  type EdgeChange,
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

  const nodes = usePlannerStore((state) => state.present.nodes)
  const edges = usePlannerStore((state) => state.present.edges)
  const applyNodeChanges = usePlannerStore((state) => state.applyNodeChanges)
  const applyEdgeChanges = usePlannerStore((state) => state.applyEdgeChanges)
  const setNodes = usePlannerStore((state) => state.setNodes)
  const setEdges = usePlannerStore((state) => state.setEdges)
  const removeNode = usePlannerStore((state) => state.removeNode)
  const removeEdge = usePlannerStore((state) => state.removeEdge)
  const pushToHistory = usePlannerStore((state) => state.pushToHistory)
  const updateNode = usePlannerStore((state) => state.updateNode)

  const [isLayouted, setIsLayouted] = useState(false)
  const nodesInitialized = useNodesInitialized()
  const { fitView } = useReactFlow()

  const [menu, setMenu] = useState<{
    id: string | null
    top?: number
    left?: number
    right?: number
    bottom?: number
  } | null>(null)
  const reactFlowWrapper = useRef<HTMLDivElement>(null)

  // Wrap onNodesChange to use store action
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      applyNodeChanges(changes)
    },
    [applyNodeChanges],
  )

  // Wrap onEdgesChange to use store action
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      applyEdgeChanges(changes)
    },
    [applyEdgeChanges],
  )

  // ALL HOOKS MUST BE DEFINED BEFORE ANY EARLY RETURNS
  const onConnect = useCallback(
    (params: any) => {
      pushToHistory()

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
      const currentEdges = usePlannerStore.getState().present.edges
      const updatedEdges = [...currentEdges, newEdge]
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
      setEdges(updatedEdges)
    },
    [pushToHistory, nodes, plannerData, setEdges],
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
      pushToHistory()
      removeNode(menu.id)
      const currentEdges = usePlannerStore.getState().present.edges
      const edgesToRemove = currentEdges.filter(
        (e) => e.source === menu.id || e.target === menu.id,
      )
      edgesToRemove.forEach((e) => removeEdge(e.id))
      setMenu(null)
    }
  }, [menu, pushToHistory, removeNode, removeEdge])

  const handleAddInputConnector = useCallback(() => {
    if (!menu?.id) return

    pushToHistory()

    updateNode(menu.id, {
      customInputs: [
        ...((nodes.find((n) => n.id === menu.id)?.data as any)?.customInputs || []),
        { id: `custom-input-${crypto.randomUUID()}` },
      ],
    })
    setMenu(null)
  }, [menu?.id, pushToHistory, updateNode, nodes])

  const handleAddOutputConnector = useCallback(() => {
    if (!menu?.id) return

    pushToHistory()

    updateNode(menu.id, {
      customOutputs: [
        ...((nodes.find((n) => n.id === menu.id)?.data as any)?.customOutputs || []),
        { id: `custom-output-${crypto.randomUUID()}` },
      ],
    })
    setMenu(null)
  }, [menu?.id, pushToHistory, updateNode, nodes])

  const handleRemoveInputConnector = useCallback(
    (connectorId: string) => {
      if (!menu?.id) return

      pushToHistory()

      const currentEdges = usePlannerStore.getState().present.edges
      const edgesToRemove = currentEdges.filter(
        (edge) => edge.target === menu.id && edge.targetHandle === connectorId,
      )
      edgesToRemove.forEach((e) => removeEdge(e.id))

      const node = nodes.find((n) => n.id === menu.id)
      if (node) {
        const customInputs = ((node.data as any)?.customInputs || []).filter(
          (input: any) => input.id !== connectorId,
        )
        updateNode(menu.id, { customInputs })
      }
      setMenu(null)
    },
    [menu?.id, pushToHistory, removeEdge, updateNode, nodes],
  )

  const handleRemoveOutputConnector = useCallback(
    (connectorId: string) => {
      if (!menu?.id) return

      pushToHistory()

      const currentEdges = usePlannerStore.getState().present.edges
      const edgesToRemove = currentEdges.filter(
        (edge) => edge.source === menu.id && edge.sourceHandle === connectorId,
      )
      edgesToRemove.forEach((e) => removeEdge(e.id))

      const node = nodes.find((n) => n.id === menu.id)
      if (node) {
        const customOutputs = ((node.data as any)?.customOutputs || []).filter(
          (output: any) => output.id !== connectorId,
        )
        updateNode(menu.id, { customOutputs })
      }
      setMenu(null)
    },
    [menu?.id, pushToHistory, removeEdge, updateNode, nodes],
  )

  const handleDisconnect = useCallback(() => {
    if (!menu?.id) return

    pushToHistory()

    const currentEdges = usePlannerStore.getState().present.edges
    const edgesToRemove = currentEdges.filter(
      (edge) => edge.source === menu.id || edge.target === menu.id,
    )
    edgesToRemove.forEach((e) => removeEdge(e.id))
    setMenu(null)
  }, [menu?.id, pushToHistory, removeEdge])

  // Apply layout when nodes are added via production chain
  const previousNodesLengthRef = useRef(nodes.length)
  useEffect(() => {
    if (nodes.length > previousNodesLengthRef.current) {
      const { nodes: layoutedNodes, edges: layoutedEdges } =
        getLayoutedElements(nodes, edges, 'LR')
      setNodes(layoutedNodes as any)
      setEdges(layoutedEdges as any)
      setTimeout(() => fitView({ padding: 0.1 }), 100)
    }
    previousNodesLengthRef.current = nodes.length
  }, [nodes.length, nodes, edges, setNodes, setEdges, fitView])
  useEffect(() => {
    if (nodesInitialized && nodes.length > 0 && !isLayouted) {
      const { nodes: layoutedNodes, edges: layoutedEdges } =
        getLayoutedElements(nodes, edges, 'LR')
      setNodes(layoutedNodes as any)
      setEdges(layoutedEdges as any)
      setIsLayouted(true)
      setTimeout(() => fitView({ padding: 0.1 }), 100)
    }
  }, [
    nodesInitialized,
    nodes.length,
    nodes,
    isLayouted,
    edges,
    setNodes,
    setEdges,
    fitView,
  ])

  // Calculate edge efficiency when nodes or planner data changes
  useEffect(() => {
    if (!plannerData?.recipes || !plannerData?.buildings || nodes.length === 0)
      return

    const currentEdges = usePlannerStore.getState().present.edges
    let hasChanges = false
    const updatedEdges = currentEdges.map((edge: any) => {
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
    if (hasChanges) {
      setEdges(updatedEdges)
    }
  }, [nodes, plannerData, setEdges])

  const handleRecipeChange = useCallback(
    (nodeId: string, newRecipeId: string) => {
      pushToHistory()

      const recipe = plannerData?.recipes[newRecipeId]
      const building = nodes.find((n) => n.id === nodeId)?.data.buildingId
      const oldBuilding = nodes.find((n) => n.id === nodeId)

      if (!recipe || !building || !oldBuilding) return

      const buildingData = plannerData?.buildings[building]
      if (!buildingData) return

      updateNode(nodeId, {
        recipeId: newRecipeId,
        outputRate: calculateOutputRate(recipe, buildingData, oldBuilding.data.count || 1),
      })
    },
    [plannerData, nodes, pushToHistory, updateNode],
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
