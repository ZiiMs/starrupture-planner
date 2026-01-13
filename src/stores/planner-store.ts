import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { PlannerNode, PlannerEdge } from '@/types/planner'

interface PlannerState {
  nodes: PlannerNode[]
  edges: PlannerEdge[]
  past: Array<{ nodes: PlannerNode[]; edges: PlannerEdge[] }>
  future: Array<{ nodes: PlannerNode[]; edges: PlannerEdge[] }>

  setNodes: (nodes: PlannerNode[]) => void
  setEdges: (edges: PlannerEdge[]) => void
  addNode: (node: PlannerNode) => void
  addNodes: (nodes: PlannerNode[]) => void
  removeNode: (nodeId: string) => void
  updateNode: (nodeId: string, data: Partial<PlannerNode['data']>) => void
  addEdge: (edge: PlannerEdge) => void
  removeEdge: (edgeId: string) => void

  pushToHistory: () => void
  undo: () => void
  redo: () => void
  clearHistory: () => void
}

export const usePlannerStore = create<PlannerState>()(
  persist(
    (set, get) => ({
      nodes: [],
      edges: [],
      past: [],
      future: [],

      setNodes: (nodes: PlannerNode[]) => {
        set({ nodes })
      },

      setEdges: (edges: PlannerEdge[]) => {
        set({ edges })
      },

      addNode: (node: PlannerNode) => {
        get().pushToHistory()
        const { nodes } = get()
        set({ nodes: [...nodes, node] })
      },

      addNodes: (newNodes: PlannerNode[]) => {
        get().pushToHistory()
        const { nodes } = get()
        set({ nodes: [...nodes, ...newNodes] })
      },

      removeNode: (nodeId: string) => {
        get().pushToHistory()
        const { nodes } = get()
        set({ nodes: nodes.filter((n) => n.id !== nodeId) })
      },

      updateNode: (nodeId: string, data: Partial<PlannerNode['data']>) => {
        get().pushToHistory()
        const { nodes } = get()
        set({
          nodes: nodes.map((n) =>
            n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
          ),
        })
      },

      addEdge: (edge: PlannerEdge) => {
        get().pushToHistory()
        const { edges } = get()
        set({ edges: [...edges, edge] })
      },

      removeEdge: (edgeId: string) => {
        get().pushToHistory()
        const { edges } = get()
        set({ edges: edges.filter((e) => e.id !== edgeId) })
      },

      pushToHistory: () => {
        const { past, nodes, edges } = get()
        set({
          past: [...past, { nodes, edges }].slice(-50),
          future: [],
        })
      },

      undo: () => {
        const { past, nodes, edges, future } = get()
        if (past.length === 0) return

        const previous = past[past.length - 1]
        set({
          nodes: previous.nodes,
          edges: previous.edges,
          past: past.slice(0, -1),
          future: [{ nodes, edges }, ...future],
        })
      },

      redo: () => {
        const { future, nodes, edges, past } = get()
        if (future.length === 0) return

        const next = future[0]
        set({
          nodes: next.nodes,
          edges: next.edges,
          future: future.slice(1),
          past: [...past, { nodes, edges }],
        })
      },

      clearHistory: () => {
        set({
          past: [],
          future: [],
        })
      },
    }),
    {
      name: 'starrupture-planner',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
      }),
    },
  ),
)

export const selectCanUndo = (state: PlannerState) => state.past.length > 0
export const selectCanRedo = (state: PlannerState) => state.future.length > 0
export const selectNodes = (state: PlannerState) => state.nodes
export const selectEdges = (state: PlannerState) => state.edges
