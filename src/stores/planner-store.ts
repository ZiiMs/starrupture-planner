import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react'
import { toast } from 'sonner'
import type { PlannerNode, PlannerEdge, HistoryState } from '@/types/planner'

interface PlannerState extends HistoryState {
  setNodes: (nodes: PlannerNode[]) => void
  setEdges: (edges: PlannerEdge[]) => void
  addNode: (node: PlannerNode) => void
  addNodes: (nodes: PlannerNode[]) => void
  removeNode: (nodeId: string) => void
  updateNode: (nodeId: string, data: Partial<PlannerNode['data']>) => void
  addEdge: (edge: PlannerEdge) => void
  removeEdge: (edgeId: string) => void
  applyNodeChanges: (changes: NodeChange[]) => void
  applyEdgeChanges: (changes: EdgeChange[]) => void
  pushToHistory: () => void
  undo: () => void
  redo: () => void
  clearHistory: () => void
  clearAll: () => void
}

export const usePlannerStore = create<PlannerState>()(
  persist(
    (set, get) => ({
      past: [],
      present: { nodes: [], edges: [] },
      future: [],

      setNodes: (nodes) => {
        set({ present: { ...get().present, nodes } })
      },

      setEdges: (edges) => {
        set({ present: { ...get().present, edges } })
      },

      addNode: (node) => {
        get().pushToHistory()
        const { present } = get()
        set({ present: { ...present, nodes: [...present.nodes, node] } })
      },

      addNodes: (newNodes) => {
        get().pushToHistory()
        const { present } = get()
        set({ present: { ...present, nodes: [...present.nodes, ...newNodes] } })
      },

      removeNode: (nodeId) => {
        get().pushToHistory()
        const { present } = get()
        set({
          present: {
            ...present,
            nodes: present.nodes.filter((n) => n.id !== nodeId),
          },
        })
      },

      updateNode: (nodeId, data) => {
        get().pushToHistory()
        const { present } = get()
        set({
          present: {
            ...present,
            nodes: present.nodes.map((n) =>
              n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n,
            ),
          },
        })
      },

      addEdge: (edge) => {
        get().pushToHistory()
        const { present } = get()
        set({ present: { ...present, edges: [...present.edges, edge] } })
      },

      removeEdge: (edgeId) => {
        get().pushToHistory()
        const { present } = get()
        set({
          present: {
            ...present,
            edges: present.edges.filter((e) => e.id !== edgeId),
          },
        })
      },

      applyNodeChanges: (changes) => {
        const { present } = get()
        // Check if any meaningful changes (not just selection/dimensions)
        const meaningfulChanges = changes.filter(
          (c) => c.type !== 'select' && c.type !== 'dimensions',
        )
        if (meaningfulChanges.length > 0) {
          get().pushToHistory()
        }
        set({
          present: {
            ...present,
            nodes: applyNodeChanges(changes, present.nodes) as PlannerNode[],
          },
        })
      },

      applyEdgeChanges: (changes) => {
        const { present } = get()
        // Check if any meaningful changes (not just selection)
        const meaningfulChanges = changes.filter((c) => c.type !== 'select')
        if (meaningfulChanges.length > 0) {
          get().pushToHistory()
        }
        set({
          present: {
            ...present,
            edges: applyEdgeChanges(changes, present.edges) as PlannerEdge[],
          },
        })
      },

      pushToHistory: () => {
        const { past, present } = get()
        set({
          past: [...past, present].slice(-50),
          future: [],
        })
      },

      undo: () => {
        const { past, present, future } = get()
        if (past.length === 0) return

        const previous = past[past.length - 1]
        set({
          past: past.slice(0, -1),
          present: previous,
          future: [present, ...future],
        })
      },

      redo: () => {
        const { future, present, past } = get()
        if (future.length === 0) return

        const next = future[0]
        set({
          future: future.slice(1),
          present: next,
          past: [...past, present],
        })
      },

      clearHistory: () => {
        const { present } = get()
        set({
          past: [],
          future: [],
          present,
        })
      },

      clearAll: () => {
        set({
          past: [],
          present: { nodes: [], edges: [] },
          future: [],
        })
        localStorage.removeItem('starrupture-planner')
      },
    }),
    {
      name: 'starrupture-planner',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({ present: state.present }),
      onRehydrateStorage: () => (state) => {
        if (state?.present?.nodes && state.present.nodes.length > 0) {
          toast.success('Saved state loaded')
        }
      },
    },
  ),
)

export const selectCanUndo = (state: PlannerState) => state.past.length > 0
export const selectCanRedo = (state: PlannerState) => state.future.length > 0
export const selectNodes = (state: PlannerState) => state.present.nodes
export const selectEdges = (state: PlannerState) => state.present.edges
