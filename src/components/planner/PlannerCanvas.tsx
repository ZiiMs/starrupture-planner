'use client'

import { useCallback, useEffect, useState, memo, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Connection,
  useNodesState,
  useEdgesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { usePlannerStore } from '@/stores/planner-store'
import { usePlannerData } from '@/hooks/use-planner-data'
import { BuildingNode } from './BuildingNode'
import Controls from './Controls'
import Minimap from './Minimap'
import BuildingSelector from './BuildingSelector'
import { NodeContextMenu } from './NodeContextMenu'

interface EnhancedBuildingNodeProps {
  items: Record<string, any>
  buildings: Record<string, any>
  recipes: Record<string, any>
}

const EnhancedBuildingNode = memo(({ items, buildings, recipes, ...props }: EnhancedBuildingNodeProps & any) => (
  <BuildingNode
    {...props}
    items={items}
    buildings={buildings}
    recipes={recipes}
  />
))

EnhancedBuildingNode.displayName = 'EnhancedBuildingNode'

function PlannerCanvas() {
  const { data: plannerData, isLoading } = usePlannerData()
  const { saveToLocalStorage } = usePlannerStore()

  const [nodes, setNodes, onNodesChange] = useNodesState<any>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([])
  const [menu, setMenu] = useState<{
    id: string | null
    top?: number
    left?: number
    right?: number
    bottom?: number
  } | null>(null)
  const reactFlowWrapper = useRef<HTMLDivElement>(null)

  const onConnect = useCallback((params: Connection) => {
    const newEdge = { ...params, type: 'smoothstep' as const }
    setEdges((eds) => [...eds, newEdge] as any)
  }, [])

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

  const onNodeContextMenu = useCallback(
    (event: any, node: any) => {
      event.preventDefault()

      const pane = reactFlowWrapper.current?.getBoundingClientRect()
      if (!pane) return

      setMenu({
        id: node.id,
        top: event.clientY < pane.height - 200 ? event.clientY : undefined,
        left: event.clientX < pane.width - 200 ? event.clientX : undefined,
        right: event.clientX >= pane.width - 200 ? pane.width - event.clientX : undefined,
        bottom:
          event.clientY >= pane.height - 200 ? pane.height - event.clientY : undefined,
      })
    },
    [],
  )

  const onPaneClick = useCallback(() => {
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
      setNodes((nds) =>
        nds.map((n: any) => {
          if (n.id === nodeId) {
            const newRecipe = plannerData?.recipes[newRecipeId]
            if (newRecipe) {
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
          }
          return n
        }),
      )
      setTimeout(() => saveToLocalStorage(), 500)
    },
    [setNodes, plannerData?.recipes, saveToLocalStorage],
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [saveToLocalStorage])

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
    <div className="flex h-screen w-full">
      <div className="flex-shrink-0 p-4 border-r border-border bg-background">
        <BuildingSelector
          buildings={plannerData.buildings}
          recipes={plannerData.recipes}
          items={plannerData.items}
        />
      </div>

      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onNodeContextMenu={onNodeContextMenu}
          onPaneClick={onPaneClick}
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
          fitView
          className="bg-background"
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: true,
          }}
        >
          <Background />
          <Controls />
          <Minimap />
        </ReactFlow>

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
      </div>
    </div>
  )
}

export default PlannerCanvas
