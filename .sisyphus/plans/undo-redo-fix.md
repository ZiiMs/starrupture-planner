# Work Plan: Undo/Redo Fix with Zustand Persistence

## Context

### Original Request
The undo/redo buttons don't work - clicking them has no effect.

### Interview Summary

**Key Discussions**:
- **Root cause identified**: Canvas uses local `useNodesState`/`useEdgesState` while store has history state that's never connected to the canvas
- **Solution chosen**: Make Zustand store the single source of truth for nodes, edges, and history
- **User confirmed**: Add persistence middleware for automatic localStorage saving
- **User confirmed**: Update `BuildingSelector.tsx` to use store actions
- **User confirmed**: Limit history to 50 entries, start fresh (existing data lost)

**Research Findings**:
- `PlannerCanvas.tsx` uses local ReactFlow state (`useNodesState`/`useEdgesState`)
- `planner-store.ts` has history state (`past`/`present`/`future`) but canvas ignores it
- `Controls.tsx` calls `undo()`/`redo()` but store updates don't propagate to canvas
- `BuildingSelector.tsx` uses `useReactFlow().addNodes()` which bypasses store
- `PlannerCanvas.tsx:276-289` has direct localStorage access that conflicts with store

### Metis Review
**Identified Gaps** (addressed):
- BuildingSelector bypasses store → Will update to use store actions
- History granularity undefined → Confirmed: only structural changes create history
- SSR hydration → Will use `skipHydration` option
- History size unbounded → Confirmed: limit to 50 entries

---

## Work Objectives

### Core Objective
Fix broken undo/redo functionality by making Zustand store the source of truth for canvas state, and add automatic persistence for data survival across browser refreshes.

### Concrete Deliverables
- `src/stores/planner-store.ts` - Extended with nodes/edges state, history actions, persist middleware
- `src/components/planner/PlannerCanvas.tsx` - Reads from store, removes localStorage
- `src/components/planner/Controls.tsx` - Undo/redo works, save/load removed
- `src/components/planner/BuildingSelector.tsx` - Uses store actions for node/edge operations

### Definition of Done
- [ ] Undo button reverses the last structural change
- [ ] Redo button restores the last undone change
- [ ] Canvas state persists across browser refresh
- [ ] Adding nodes via BuildingSelector creates history entry
- [ ] Deleting nodes via context menu creates history entry
- [ ] Connecting edges creates history entry
- [ ] Dragging nodes does NOT create history entry
- [ ] No hydration mismatch warnings in console

### Must Have
- Zustand store as single source of truth for nodes and edges
- History tracking (undo/redo) for structural changes only
- Automatic persistence to localStorage
- BuildingSelector integrated with store
- History limit of 50 entries

### Must NOT Have (Guardrails)
- History entries for position updates (dragging nodes)
- Past/future arrays persisted (only present)
- Duplicate localStorage access in PlannerCanvas
- Manual save/load buttons (persistence handles it)
- Changes to `HistoryState` type structure

---

## Verification Strategy (Manual Only)

> No test infrastructure. Exhaustive manual verification required.

### Verification Procedures

| Action | Verification Tool | Procedure |
|--------|------------------|-----------|
| Add node → Undo | Browser + Playwright | Add node, click Undo, verify node gone |
| Add edge → Undo | Browser + Playwright | Connect nodes, click Undo, verify edge gone |
| Delete node → Redo | Browser + Playwright | Delete node, click Redo, verify node back |
| Refresh page | Browser + Playwright | Add nodes, refresh, verify nodes still there |
| History limit | Browser + Playwright | Add 60 nodes, verify only last 50 can be undone |

---

## Task Flow

```
Task 1: Extend planner-store.ts with nodes/edges, history actions, persistence
    │
    ▼
Task 2: Update PlannerCanvas to read from store, remove localStorage
    │
    ▼
Task 3: Update Controls.tsx (simplify, keep undo/redo)
    │
    ▼
Task 4: Update BuildingSelector to use store actions
```

---

## Parallelization

| Task | Depends On | Reason |
|------|------------|--------|
| 1 | None | Foundation - must be first |
| 2 | 1 | Requires store actions to exist |
| 3 | 1 | Requires store actions to exist |
| 4 | 1 | Requires store actions to exist |

---

## TODOs

> Implementation + Test = ONE Task. Never separate.

- [ ] 1. Extend planner-store.ts with nodes/edges state, history actions, and persistence

  **What to do**:
  - Add `nodes` and `edges` state to the store (extending HistoryState)
  - Add `setNodes` action that:
    - Pushes current `present` to `past` (if structural change)
    - Updates `present.nodes`
    - Limits history to 50 entries (shift oldest if exceeded)
    - Clears `future`
  - Add `setEdges` action with same pattern
  - Add `addNodes` action for adding single/multiple nodes with history
  - Add `addEdges` action for adding edges with history
  - Add `deleteNode` action for removing nodes with history
  - Add `deleteEdge` action for removing edges with history
  - Add `clearHistory` action (already exists, keep it)
  - Wrap store with `persist` middleware:
    - `name: 'starrupture-planner'`
    - `partialize: (state) => ({ present: state.present })` - only persist present
    - `skipHydration: true`
  - Update `selectCanUndo` and `selectCanRedo` selectors

  **Must NOT do**:
  - Push to history for position-only changes (drag events)
  - Persist `past` or `future` arrays
  - Remove existing history state structure

  **Parallelizable**: NO (depends on nothing, but other tasks depend on it)

  **References** (CRITICAL - Be Exhaustive):

  **Pattern References** (existing code to follow):
  - `src/stores/planner-store.ts:17-28` - Current undo() pattern (how history manipulation works)
  - `src/stores/planner-store.ts:31-43` - Current redo() pattern
  - `src/stores/planner-store.ts:68-75` - Current clearHistory() pattern (resetting without losing present)
  - `src/types/planner.ts:72-76` - HistoryState interface (past/present/future types)

  **Type References** (contracts to implement against):
  - `src/types/planner.ts:59` - PlannerNode type
  - `src/types/planner.ts:70` - PlannerEdge type
  - `src/types/planner.ts:73-75` - HistoryState arrays (Array<{nodes, edges}>)

  **External References** (libraries and frameworks):
  - Zustand persist docs: `https://zustand.docs.pmnd.rs/middleware/persistence`
  - Key patterns:
    ```typescript
    persist(
      (set, get) => ({
        // store actions
      }),
      {
        name: 'starrupture-planner',
        partialize: (state) => ({ present: state.present }),
        skipHydration: true,
      }
    )
    ```

  **WHY Each Reference Matters**:
  - `planner-store.ts:17-28` - Shows exact pattern for history manipulation (slicing arrays, setting state)
  - `planner-store.ts:31-43` - Same for redo
  - `planner-store.ts:68-75` - Shows how to clear history while preserving present
  - `types/planner.ts:72-76` - Type definition for history state structure
  - Zustand persist docs - Required syntax for persistence with partialize

  **Acceptance Criteria**:

  **Store State Structure**:
  - [ ] Store has `nodes: PlannerNode[]` property
  - [ ] Store has `edges: PlannerEdge[]` property
  - [ ] Store has `past: Array<{nodes, edges}>` property (max 50)
  - [ ] Store has `future: Array<{nodes, edges}>` property
  - [ ] Store has `present: {nodes, edges}` property

  **Store Actions**:
  - [ ] `setNodes(newNodes)` - updates nodes, creates history entry, limits to 50
  - [ ] `setEdges(newEdges)` - updates edges, creates history entry, limits to 50
  - [ ] `addNodes(nodes)` - adds nodes, creates history entry
  - [ ] `addEdges(edges)` - adds edges, creates history entry
  - [ ] `undo()` - pops from past, pushes to future
  - [ ] `redo()` - pops from future, pushes to past

  **Persistence**:
  - [ ] Store wraps with `persist` middleware
  - [ ] localStorage key: `'starrupture-planner'`
  - [ ] Only `present` is persisted (not past/future)
  - [ ] `skipHydration: true` to avoid SSR mismatch

  **Manual Execution Verification**:
  - [ ] Open browser console
  - [ ] Run: `import { usePlannerStore } from '@/stores/planner-store'`
  - [ ] Run: `store = usePlannerStore.getState()`
  - [ ] Run: `console.log('nodes:', store.nodes.length, 'edges:', store.edges.length)`
  - [ ] Verify: Output shows nodes and edges arrays exist

  **Commit**: YES
  - Message: `refactor(store): add nodes/edges state with persistence and history`
  - Files: `src/stores/planner-store.ts`, `src/types/planner.ts`
  - Pre-commit: `npm run lint`

- [ ] 2. Update PlannerCanvas to read from store, remove direct localStorage

  **What to do**:
  - Import `usePlannerStore` instead of `useNodesState`/`useEdgesState`
  - Replace local state with store selectors:
    - `nodes: usePlannerStore((s) => s.present.nodes)`
    - `edges: usePlannerStore((s) => s.present.edges)`
  - Keep `onNodesChange` and `onEdgesChange` callbacks from ReactFlow
  - Update handlers to use store actions:
    - `onNodesChange` → call `store.setNodes()` with current nodes after change
    - `onEdgesChange` → call `store.setEdges()` with current edges after change
    - `onConnect` → use `store.addEdges()` instead of `setEdges`
    - `handleDeleteNode` → use store actions for node + edge deletion
    - `handleAddInputConnector` → use `store.setNodes()`
    - `handleAddOutputConnector` → use `store.setNodes()`
    - `handleRemoveInputConnector` → use `store.setNodes()`
    - `handleRemoveOutputConnector` → use `store.setNodes()`
    - `handleDisconnect` → use `store.setEdges()`
    - `handleRecipeChange` → use `store.setNodes()`
  - Remove localStorage loading in `useEffect` (lines 276-289) - persistence handles it
  - Remove `saveToLocalStorage` call - persistence handles it
  - Add hydration skip call: `usePlannerStore.persist.rehydrate()` after mount

  **Must NOT do**:
  - Create history entries on every onNodesChange (only on structural changes)
  - Keep direct localStorage access
  - Remove ReactFlow's `onNodesChange`/`onEdgesChange` handlers (need them for UI)

  **Parallelizable**: NO (depends on Task 1)

  **References** (CRITICAL - Be Exhaustive):

  **Pattern References** (existing code to follow):
  - `src/stores/planner-store.ts:1-76` - New store structure (from Task 1)
  - `src/components/planner/PlannerCanvas.tsx:95-96` - Current useNodesState/useEdgesState usage
  - `src/components/planner/PlannerCanvas.tsx:112-146` - onConnect handler pattern
  - `src/components/planner/PlannerCanvas.tsx:160-168` - handleDeleteNode pattern
  - `src/components/planner/PlannerCanvas.tsx:264-273` - handleDisconnect pattern

  **Component References** (usage patterns to follow):
  - `src/components/planner/PlannerCanvas.tsx:390-450` - ReactFlow component with nodes/edges props

  **State References** (selectors to use):
  - `usePlannerStore((s) => s.present.nodes)` - Get nodes from store
  - `usePlannerStore((s) => s.present.edges)` - Get edges from store

  **Action References** (store actions to call):
  - `store.setNodes(nodes)` - Update nodes with history
  - `store.setEdges(edges)` - Update edges with history
  - `store.addEdges(edges)` - Add edges with history
  - `usePlannerStore.getState()` - Get actions synchronously

  **External References** (libraries and frameworks):
  - Zustand selectors: `const nodes = useStore((s) => s.present.nodes)` - standard pattern
  - ReactFlow onNodesChange: Fires on any node change (position, selection, removal)

  **WHY Each Reference Matters**:
  - `PlannerCanvas.tsx:95-96` - Current pattern being replaced (local state → store)
  - `PlannerCanvas.tsx:160-168` - handleDeleteNode shows current delete pattern to migrate
  - `PlannerCanvas.tsx:112-146` - onConnect shows edge addition pattern to migrate
  - Zustand selectors - Required pattern for reactive state in components

  **Acceptance Criteria**:

  **Store Integration**:
  - [ ] Canvas reads `nodes` from `store.present.nodes`
  - [ ] Canvas reads `edges` from `store.present.edges`
  - [ ] Canvas calls `store.setNodes()` on node changes
  - [ ] Canvas calls `store.setEdges()` on edge changes

  **Removed Code**:
  - [ ] `useNodesState` import removed
  - [ ] `useEdgesState` import removed
  - [ ] Direct localStorage access removed (lines 276-289)
  - [ ] `saveToLocalStorage` call removed

  **Hydration**:
  - [ ] No hydration mismatch warnings
  - [ ] `skipHydration` option used in store

  **Manual Execution Verification**:
  - [ ] Using browser automation:
    - Navigate to: `http://localhost:3000/planner`
    - Add a building node via sidebar
    - Verify: Node appears on canvas
    - Click Undo button
    - Verify: Node disappears from canvas
    - Click Redo button
    - Verify: Node reappears on canvas
    - Screenshot: Save to `.sisyphus/evidence/task2-undo-redo.png`

  **Commit**: YES
  - Message: `refactor(canvas): read from Zustand store instead of local state`
  - Files: `src/components/planner/PlannerCanvas.tsx`
  - Pre-commit: `npm run lint`

- [ ] 3. Update Controls.tsx - simplify, keep undo/redo only

  **What to do**:
  - Keep `undo` and `redo` imports from store
  - Remove `saveToLocalStorage` and `loadFromLocalStorage` imports
  - Remove save button (UI + handler)
  - Remove load button (UI + handler)
  - Keep undo and redo buttons as-is
  - Keep button disabled state (if any) based on `selectCanUndo`/`selectCanRedo`

  **Must NOT do**:
  - Change undo/redo button appearance or behavior
  - Add new buttons or functionality

  **Parallelizable**: NO (depends on Task 1)

  **References** (CRITICAL - Be Exhaustive):

  **Pattern References** (existing code to follow):
  - `src/components/planner/Controls.tsx:1-55` - Current full file (being simplified)
  - `src/stores/planner-store.ts:78-79` - selectCanUndo/selectCanRedo selectors

  **Store References** (what to import):
  - `usePlannerStore` - store hook
  - `selectCanUndo` - selector for undo button disabled state
  - `selectCanRedo` - selector for redo button disabled state

  **External References** (libraries and frameworks):
  - None needed - straightforward UI simplification

  **WHY Each Reference Matters**:
  - `Controls.tsx:1-55` - Shows current full implementation to simplify
  - `planner-store.ts:78-79` - Shows selectors that may be used for button disabled state

  **Acceptance Criteria**:

  **UI Elements**:
  - [ ] Undo button present and functional
  - [ ] Redo button present and functional
  - [ ] Save button removed
  - [ ] Load button removed

  **Functionality**:
  - [ ] Clicking Undo calls `store.undo()`
  - [ ] Clicking Redo calls `store.redo()`

  **Manual Execution Verification**:
  - [ ] Using browser automation:
    - Navigate to: `http://localhost:3000/planner`
    - Open browser DevTools → Elements panel
    - Search for "Save" button
    - Verify: Save button NOT present
    - Search for "Load" button
    - Verify: Load button NOT present
    - Verify: Undo and Redo buttons are present

  **Commit**: YES
  - Message: `refactor(controls): remove save/load buttons, keep undo/redo`
  - Files: `src/components/planner/Controls.tsx`
  - Pre-commit: `npm run lint`

- [ ] 4. Update BuildingSelector to use store actions

  **What to do**:
  - Import `usePlannerStore` instead of `useReactFlow`
  - Replace `useReactFlow()` destructuring:
    - Remove `addNodes` and `addEdges` from `useReactFlow`
    - Get store actions: `const store = usePlannerStore.getState()` then `store.addNodes()`, `store.addEdges()`
  - Update `addBuildingNode` function (line 121-132):
    - Replace `addNodes({...})` with `store.addNodes([{...}])`
  - Update `addProductionChain` function (line 264-266):
    - Replace `addNodes(layoutedNodes)` with `store.addNodes(layoutedNodes)`
    - Replace `addEdges(edgesToAdd)` with `store.addEdges(edgesToAdd)`
  - Keep all other logic (calculations, layout, state) unchanged

  **Must NOT do**:
  - Change any calculation or layout logic
  - Remove or modify the node position calculation
  - Change the ElementSelector component interactions

  **Parallelizable**: NO (depends on Task 1)

  **References** (CRITICAL - Be Exhaustive):

  **Pattern References** (existing code to follow):
  - `src/components/planner/BuildingSelector.tsx:41` - Current useReactFlow() usage
  - `src/components/planner/BuildingSelector.tsx:121-132` - addBuildingNode function
  - `src/components/planner/BuildingSelector.tsx:264-266` - addProductionChain function

  **Store References** (what to use):
  - `usePlannerStore` - store hook
  - `store.addNodes([nodes])` - action to add nodes with history
  - `store.addEdges([edges])` - action to add edges with history

  **External References** (libraries and frameworks):
  - None needed - straightforward migration from ReactFlow to Zustand

  **WHY Each Reference Matters**:
  - `BuildingSelector.tsx:41` - Shows current hook usage to replace
  - `BuildingSelector.tsx:121-132` - Shows addBuildingNode to update
  - `BuildingSelector.tsx:264-266` - Shows addProductionChain to update

  **Acceptance Criteria**:

  **Store Integration**:
  - [ ] `useReactFlow` import removed or no longer used for addNodes/addEdges
  - [ ] `usePlannerStore` import added
  - [ ] `addBuildingNode` calls `store.addNodes([node])` instead of `addNodes(node)`
  - [ ] `addProductionChain` calls `store.addNodes(nodes)` and `store.addEdges(edges)`

  **Functionality**:
  - [ ] Adding building via sidebar creates history entry
  - [ ] Adding production chain creates history entry
  - [ ] Nodes appear on canvas after adding

  **Manual Execution Verification**:
  - [ ] Using browser automation:
    - Navigate to: `http://localhost:3000/planner`
    - Click "Add Elements" sidebar tab
    - Click a building to add
    - Verify: Node appears on canvas
    - Click Undo button
    - Verify: Node disappears from canvas
    - Add multiple nodes via production chain
    - Click Undo button multiple times
    - Verify: Each undo removes a node from the chain

  **Commit**: YES
  - Message: `refactor(selector): use store actions instead of useReactFlow`
  - Files: `src/components/planner/BuildingSelector.tsx`
  - Pre-commit: `npm run lint`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `refactor(store): add nodes/edges state with persistence and history` | `src/stores/planner-store.ts`, `src/types/planner.ts` | `npm run lint` |
| 2 | `refactor(canvas): read from Zustand store instead of local state` | `src/components/planner/PlannerCanvas.tsx` | `npm run lint` |
| 3 | `refactor(controls): remove save/load buttons, keep undo/redo` | `src/components/planner/Controls.tsx` | `npm run lint` |
| 4 | `refactor(selector): use store actions instead of useReactFlow` | `src/components/planner/BuildingSelector.tsx` | `npm run lint` |

---

## Success Criteria

### Verification Commands
```bash
npm run dev  # Start dev server on port 3000
# Then manually test in browser
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] Undo reverses structural changes
- [ ] Redo restores undone changes
- [ ] Data persists after browser refresh
- [ ] No hydration warnings in console
- [ ] History limited to 50 entries
- [ ] BuildingSelector integrates with store
