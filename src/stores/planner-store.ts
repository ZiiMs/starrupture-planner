import { create } from 'zustand'
import type { HistoryState } from '@/types/planner'

interface PlannerState extends HistoryState {
  undo: () => void
  redo: () => void
  saveToLocalStorage: () => void
  loadFromLocalStorage: () => void
  clearHistory: () => void
}

export const usePlannerStore = create<PlannerState>((set, get) => ({
  past: [],
  present: { nodes: [], edges: [] },
  future: [],

  undo: () => {
    const { past, present, future } = get()
    if (past.length === 0) return

    const previous = past[past.length - 1]
    const newPast = past.slice(0, past.length - 1)

    set({
      past: newPast,
      present: previous,
      future: [present, ...future],
    })
  },

  redo: () => {
    const { past, present, future } = get()
    if (future.length === 0) return

    const next = future[0]
    const newFuture = future.slice(1)

    set({
      past: [...past, present],
      present: next,
      future: newFuture,
    })
  },

  saveToLocalStorage: () => {
    const { present } = get()
    localStorage.setItem('starrupture-planner', JSON.stringify(present))
  },

  loadFromLocalStorage: () => {
    try {
      const saved = localStorage.getItem('starrupture-planner')
      if (saved) {
        const loaded = JSON.parse(saved)
        set({
          present: loaded,
          past: [],
          future: [],
        })
        return loaded
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error)
    }
    return null
  },

  clearHistory: () => {
    const { present } = get()
    set({
      past: [],
      future: [],
      present,
    })
  },
}))

export const selectCanUndo = (state: PlannerState) => state.past.length > 0
export const selectCanRedo = (state: PlannerState) => state.future.length > 0
