'use client'

import { useCallback, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  Connection,
  addEdge,
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
import type { Node, Edge } from '@xyflow/react'

function PlannerCanvas() {
  const { data: plannerData, isLoading } = usePlannerData()
  const { saveToLocalStorage } = usePlannerStore()

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  const onConnect = useCallback((params: Connection) => {
    const newEdge = { ...params, type: 'smoothstep' as const }
    setEdges((eds: any) => [...eds, newEdge])
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

  const EnhancedBuildingNode = (props: any) => (
    <BuildingNode
      {...props}
      items={plannerData.items}
      buildings={plannerData.buildings}
      recipes={plannerData.recipes}
    />
  )

  const enhancedNodeTypes = {
    'planner-node': EnhancedBuildingNode,
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
          nodeTypes={enhancedNodeTypes}
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
      </div>
    </div>
  )
}

export default PlannerCanvas
