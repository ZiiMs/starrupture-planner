'use client'

import { useCallback, useEffect, useState, memo } from 'react'
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
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean
    x: number
    y: number
    nodeId: string | null
  }>({ visible: false, x: 0, y: 0, nodeId: null })

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
      setContextMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        nodeId: node.id,
      })
    },
    [],
  )

  const onPaneClick = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, visible: false, nodeId: null }))
  }, [])

  const handleDeleteNode = useCallback(() => {
    if (contextMenu.nodeId) {
      setNodes((nds) => nds.filter((n: any) => n.id !== contextMenu.nodeId))
      setEdges((eds) =>
        eds.filter(
          (e: any) => e.source !== contextMenu.nodeId && e.target !== contextMenu.nodeId,
        ),
      )
      setContextMenu((prev) => ({ ...prev, visible: false, nodeId: null }))
      setTimeout(() => saveToLocalStorage(), 500)
    }
  }, [contextMenu.nodeId, setNodes, setEdges, saveToLocalStorage])

  const handleAddInputConnector = useCallback(() => {
    console.log('Add input connector for node:', contextMenu.nodeId)
    setContextMenu((prev) => ({ ...prev, visible: false, nodeId: null }))
  }, [contextMenu.nodeId])

  const handleAddOutputConnector = useCallback(() => {
    console.log('Add output connector for node:', contextMenu.nodeId)
    setContextMenu((prev) => ({ ...prev, visible: false, nodeId: null }))
  }, [contextMenu.nodeId])

  const handleMenuClose = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, visible: false, nodeId: null }))
  }, [])

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

      <div className="flex-1 relative">
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

        {contextMenu.visible && (
          <div
            style={{
              position: 'absolute',
              left: contextMenu.x,
              top: contextMenu.y,
              zIndex: 9999,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <NodeContextMenu
              onMenuClose={handleMenuClose}
              onDeleteNode={handleDeleteNode}
              onAddInputConnector={handleAddInputConnector}
              onAddOutputConnector={handleAddOutputConnector}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default PlannerCanvas
