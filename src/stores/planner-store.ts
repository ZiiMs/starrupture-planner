import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { toast } from 'sonner'
import type { HistoryState } from '@/types/planner'

interface PlannerState extends HistoryState {
  undo: () => void
  redo: () => void
  clearHistory: () => void
}

export const usePlannerStore = create<PlannerState>()(
  persist(
    (set, get) => ({
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

      clearHistory: () => {
        const { present } = get()
        set({
          past: [],
          future: [],
          present,
        })
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
