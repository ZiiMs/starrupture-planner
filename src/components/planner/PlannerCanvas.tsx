'use client'

import { usePlannerData } from '@/hooks/use-planner-data'
import { getLayoutedElements } from '@/lib/dagre-layout'
import { usePlannerStore } from '@/stores/planner-store'
import {
  Background,
  Connection,
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
  const { saveToLocalStorage } = usePlannerStore()

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

  // Apply layout once nodes are measured
  useEffect(() => {
    if (nodesInitialized && nodes.length > 0 && !isLayouted) {
      const currentNodes = getNodes()
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        currentNodes,
        edges,
        'LR'
      )
      setNodes(layoutedNodes)
      setEdges(layoutedEdges)
      setIsLayouted(true)

      // Fit view after layout is applied
      window.requestAnimationFrame(() => {
        fitView({ padding: 0.1 })
      })
    }
  }, [nodesInitialized, nodes.length, isLayouted, getNodes, edges, setNodes, setEdges, fitView])

  const onConnect = useCallback((params: Connection) => {
    const newEdge = {
      ...params,
      type: 'efficiency-edge' as const,
      animated: true,
      data: {
        usageRate: 0,
        producerRate: 0,
        isWarning: false,
      },
    }
    setEdges((eds) => [...eds, newEdge] as any)
  }, [setEdges])

  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesChange(changes)
      setTimeout(() => saveToLocalStorage(), 500)
    },
    [onNodesChange, saveToLocalStorage],
  )

  const handleEdgesChange = useCallback(
    (changes: any) => {
      onEdgesChange(changes)
      setTimeout(() => saveToLocalStorage(), 500)
    },
    [onEdgesChange, saveToLocalStorage],
  )

  const onNodeContextMenu = useCallback((event: any, node: any) => {
    event.preventDefault()

    const pane = reactFlowWrapper.current?.getBoundingClientRect()
    if (!pane) return

    setMenu({
      id: node.id,
      top:
        event.clientY < pane.height - 200
          ? event.clientY - pane.top
          : undefined,
      left:
        event.clientX < pane.width - 200
          ? event.clientX - pane.left
          : undefined,
      right:
        event.clientX >= pane.width - 200
          ? pane.right - event.clientX
          : undefined,
      bottom:
        event.clientY >= pane.height - 200
          ? pane.bottom - event.clientY
          : undefined,
    })
  }, [])

  const onPaneClick = useCallback(() => {
    setMenu(null)
  }, [])

  const onNodeClick = useCallback(() => {
    setMenu(null)
  }, [])

  const handleDeleteNode = useCallback(() => {
    if (menu?.id) {
      setNodes((nds) => nds.filter((n: any) => n.id !== menu.id))
      setEdges((eds) =>
        eds.filter((e: any) => e.source !== menu.id && e.target !== menu.id),
      )
      setMenu(null)
      setTimeout(() => saveToLocalStorage(), 500)
    }
  }, [menu?.id, setNodes, setEdges, saveToLocalStorage])

  const handleAddInputConnector = useCallback(() => {
    if (menu?.id) {
      setNodes((nds) =>
        nds.map((n: any) => {
          if (n.id === menu.id) {
            const customInputs = n.data.customInputs || []
            return {
              ...n,
              data: {
                ...n.data,
                customInputs: [...customInputs, { id: Date.now() }],
              },
            }
          }
          return n
        }),
      )
      setMenu(null)
      setTimeout(() => saveToLocalStorage(), 500)
    }
  }, [menu?.id, setNodes, saveToLocalStorage])

  const handleAddOutputConnector = useCallback(() => {
    if (menu?.id) {
      setNodes((nds) =>
        nds.map((n: any) => {
          if (n.id === menu.id) {
            const customOutputs = n.data.customOutputs || []
            return {
              ...n,
              data: {
                ...n.data,
                customOutputs: [...customOutputs, { id: Date.now() }],
              },
            }
          }
          return n
        }),
      )
      setMenu(null)
      setTimeout(() => saveToLocalStorage(), 500)
    }
  }, [menu?.id, setNodes, saveToLocalStorage])

  const handleRecipeChange = useCallback(
    (nodeId: string, newRecipeId: string) => {
      const newRecipe = plannerData?.recipes[newRecipeId]
      if (!newRecipe) return

      if (!plannerData?.buildings) return

      setNodes((nds) => {
        const updatedNodes = nds.map((n: any) => {
          if (n.id === nodeId) {
            return {
              ...n,
              data: {
                ...n.data,
                recipeId: newRecipeId,
                customInputs: [],
                customOutputs: [],
              },
            }
          }
          return n
        })

        setEdges((eds) =>
          eds.map((e: any) => {
            const edgeData = e.data || {}

            if (e.source === nodeId && edgeData.itemId) {
              const sourceNode = updatedNodes.find((n: any) => n.id === nodeId)
              const targetNode = updatedNodes.find((n: any) => n.id === e.target)

              if (sourceNode && targetNode) {
                const sourceRecipe = plannerData?.recipes[sourceNode.data.recipeId]
                const targetRecipe = plannerData?.recipes[targetNode.data.recipeId]
                const sourceBuilding = plannerData?.buildings[sourceNode.data.buildingId]

                if (sourceRecipe && targetRecipe && sourceBuilding) {
                  const inputAmount =
                    targetRecipe.inputs.find((i: any) => i.itemId === edgeData.itemId)?.amount || 1
                  const usageRate = (inputAmount / targetRecipe.time) * 60

                  const craftsPerSecond =
                    (sourceNode.data.count * sourceBuilding.speed) / sourceRecipe.time
                  const producerRate =
                    craftsPerSecond * 60 * (sourceRecipe.outputs[0]?.amount || 1)

                  const isWarning = producerRate > usageRate

                  return {
                    ...e,
                    data: {
                      ...edgeData,
                      usageRate,
                      producerRate,
                      isWarning,
                      sourceNodeId: e.source,
                      targetNodeId: e.target,
                    },
                  }
                }
              }
            }

            if (e.target === nodeId && edgeData.itemId) {
              const sourceNode = updatedNodes.find((n: any) => n.id === e.source)
              const targetNode = updatedNodes.find((n: any) => n.id === nodeId)

              if (sourceNode && targetNode) {
                const sourceRecipe = plannerData?.recipes[sourceNode.data.recipeId]
                const targetRecipe = plannerData?.recipes[targetNode.data.recipeId]
                const sourceBuilding = plannerData?.buildings[sourceNode.data.buildingId]

                if (sourceRecipe && targetRecipe && sourceBuilding) {
                  const inputAmount =
                    targetRecipe.inputs.find((i: any) => i.itemId === edgeData.itemId)?.amount || 1
                  const usageRate = (inputAmount / targetRecipe.time) * 60

                  const craftsPerSecond =
                    (sourceNode.data.count * sourceBuilding.speed) / sourceRecipe.time
                  const producerRate =
                    craftsPerSecond * 60 * (sourceRecipe.outputs[0]?.amount || 1)

                  const isWarning = producerRate > usageRate

                  return {
                    ...e,
                    data: {
                      ...edgeData,
                      usageRate,
                      producerRate,
                      isWarning,
                      sourceNodeId: e.source,
                      targetNodeId: e.target,
                    },
                  }
                }
              }
            }

            return e
          })
        )

        return updatedNodes
      })

      // Trigger re-layout after recipe change since node size may change
      setIsLayouted(false)
      setTimeout(() => saveToLocalStorage(), 500)
    },
    [setNodes, setEdges, plannerData?.recipes, plannerData?.buildings, saveToLocalStorage],
  )

  // Manual re-layout function
  const handleRelayout = useCallback(() => {
    const currentNodes = getNodes()
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      currentNodes,
      edges,
      'LR'
    )
    setNodes(layoutedNodes)
    setEdges(layoutedEdges)

    window.requestAnimationFrame(() => {
      fitView({ padding: 0.1 })
    })
  }, [getNodes, edges, setNodes, setEdges, fitView])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        usePlannerStore.getState().undo()
      }

      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === 'y' || (e.key === 'z' && e.shiftKey))
      ) {
        e.preventDefault()
        usePlannerStore.getState().redo()
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        saveToLocalStorage()
      }

      if (e.key === 'Escape' && menu) {
        e.preventDefault()
        setMenu(null)
      }

      // Add keyboard shortcut for re-layout (Ctrl/Cmd + L)
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault()
        handleRelayout()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [saveToLocalStorage, menu, handleRelayout])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-sm text-muted-foreground">Loading planner...</div>
      </div>
    )
  }

  if (!plannerData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-sm text-destructive">
          Failed to load planner data
        </div>
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
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
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
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
        }}
      >
        <Background />
        <Controls  />
        <Minimap />

        {menu && (
          <NodeContextMenu
            onClick={onPaneClick}
            top={menu.top}
            left={menu.left}
            right={menu.right}
            bottom={menu.bottom}
            onDeleteNode={handleDeleteNode}
            onAddInputConnector={handleAddInputConnector}
            onAddOutputConnector={handleAddOutputConnector}
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