# Work Plan: Restore Persistence Formula (Match d0e207a)

**Status**: Ready for Implementation  
**Priority**: High  
**Estimated Time**: 20-30 minutes

---

## Problem Statement

The persistence layer is broken. The store uses flat `nodes/edges` at root level but needs to use `present: { nodes, edges }` structure matching commit d0e207a. Additionally, there's duplicate localStorage logic in PlannerCanvas.tsx that bypasses Zustand persist.

### Current Broken State

- Store structure: `past: []`, `nodes: []`, `edges: []`, `future: []` (flat)
- Missing hydration trigger
- Missing toast notification
- Duplicate localStorage code in PlannerCanvas.tsx

### Target Working State (d0e207a)

- Store structure: `past: []`, `present: { nodes: [], edges: [] }`, `future: []`
- `skipHydration: true` with manual `persistHydration()` call
- Toast notification on load
- `partialize` saves only `present`
- Clean, single source of truth via Zustand persist

---

## Implementation Steps

### Step 1: Rewrite planner-store.ts

**File**: `src/stores/planner-store.ts`

Changes needed:

1. Add `toast` import
2. Import `HistoryState` type from `@/types/planner`
3. Interface extends `HistoryState`
4. Initial state: `past: []`, `present: { nodes: [], edges: [] }`, `future: []`
5. All actions use `present.nodes` / `present.edges`
6. Persist config with `skipHydration: true`, `partialize: state => ({ present: state.present })`, `onRehydrateStorage` callback
7. Selectors return `state.present.nodes` / `state.present.edges`

Reference: `d0e207a:src/stores/planner-store.ts`

---

### Step 2: Add HydrationTrigger to planner.tsx

**File**: `src/routes/planner.tsx`

Changes needed:

1. Add `useEffect` and `usePlannerStore` imports
2. Add HydrationTrigger component that calls `usePlannerStore.persistHydration()`
3. Render `<HydrationTrigger />` in component tree

---

### Step 3: Update PlannerCanvas.tsx

**File**: `src/components/planner/PlannerCanvas.tsx`

Changes needed:

1. Update selectors from `state.nodes` to `state.present.nodes`
2. **REMOVE duplicate localStorage logic (lines 365-388)** - this bypasses Zustand persist

---

### Step 4: Update BuildingSelector.tsx (if needed)

**File**: `src/components/planner/BuildingSelector.tsx`

Changes needed:

1. Check selectors, update to use `state.present.nodes` / `state.present.edges`

---

## Acceptance Criteria

### Functional

- App loads with toast "Saved state loaded" when localStorage has data
- Nodes persist after page refresh
- Undo/redo works for current session

### Observable

- Toast notification appears on successful load
- Console has no errors
- No duplicate localStorage calls

### Pass/Fail

- `npm run lint` passes (0 errors)
- `npm run test` passes
- Manual test: add nodes, refresh page, nodes appear
- Manual test: add nodes, undo, nodes removed

---

## Notes

- User confirmed OK to lose old saved data (no migration needed)
- Multi-tab sync not a concern
