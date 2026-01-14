import { useCallback, useState, useRef, useEffect } from 'react'
import { usePlannerStore } from '@/stores/planner-store'
import { getLayoutedElements, estimateNodeHeight } from '@/lib/dagre-layout'
import type { Node, Edge } from '@xyflow/react'
import type { Recipe } from '@/types/planner'

export type LayoutDirection = 'LR' | 'TB'

/**
 * Centralized hook for auto-layout functionality.
 *
 * This is the SINGLE entry point for all layout operations in the planner.
 * All code that needs to layout nodes should use this hook's runAutoLayout function.
 *
 * Usage:
 *   const { runAutoLayout, autoLayoutDirection, setAutoLayoutDirection } = useAutoLayout()
 *
 * Features:
 * - Debounced to prevent rapid-fire calls (300ms)
 * - Supports both Left-to-Right and Top-to-Bottom layouts
 * - Integrates with Zustand store for state management
 */
export function useAutoLayout(recipes?: Record<string, Recipe>) {
  const [autoLayoutDirection, setAutoLayoutDirection] = useState<LayoutDirection>('LR')

  // Use refs to always get fresh state (avoid stale closures)
  const nodesRef = useRef(usePlannerStore.getState().present.nodes)
  const edgesRef = useRef(usePlannerStore.getState().present.edges)

  // Keep refs in sync with store
  useEffect(() => {
    const unsubscribe = usePlannerStore.subscribe((state) => {
      nodesRef.current = state.present.nodes
      edgesRef.current = state.present.edges
    })
    return unsubscribe
  }, [])

  const setNodesRef = useRef(usePlannerStore.getState().setNodes)
  const setEdgesRef = usePlannerStore.getState().setEdges

  // Update refs when store actions change
  useEffect(() => {
    setNodesRef.current = usePlannerStore.getState().setNodes
  }, [])

  // Debounce timer ref
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const runAutoLayout = useCallback(
    (direction?: LayoutDirection) => {
      const effectiveDirection = direction ?? autoLayoutDirection

      // Clear any pending debounced call
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      // Debounce the layout call
      debounceTimerRef.current = setTimeout(() => {
        // Use refs to get fresh state
        const currentNodes = nodesRef.current
        const currentEdges = edgesRef.current

        // Log node heights for debugging
        console.log('=== Auto Layout Debug ===')
        console.log(`Direction: ${effectiveDirection}`)
        console.log(`Nodes: ${currentNodes.length}`)
        currentNodes.forEach((node, index) => {
          const height = node.measured?.height ?? estimateNodeHeight(node, recipes)
          console.log(`Node ${index + 1}: ${node.id} - height: ${height}px`)
        })

        const layoutedElements = getLayoutedElements(
          currentNodes as Node[],
          currentEdges as Edge[],
          effectiveDirection,
          recipes,
        )

        // Update store with new positions
        setNodesRef.current(layoutedElements.nodes as any)
        setEdgesRef(layoutedElements.edges as any)

        debounceTimerRef.current = null
      }, 300)
    },
    [autoLayoutDirection, recipes],
  )

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  return {
    runAutoLayout,
    autoLayoutDirection,
    setAutoLayoutDirection,
  }
}
