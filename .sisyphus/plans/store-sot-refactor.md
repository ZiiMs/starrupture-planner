# Refactor: Store as Single Source of Truth for Undo/Redo

## Context

### Problem

The current hybrid architecture (local ReactFlow state + Zustand history) has a critical bug:

**Current Flow (Broken):**

```
User adds building:
1. pushToHistory(nodes, edges) ← captures OLD state
2. setNodes([...nodes, newNode]) ← updates ReactFlow LOCAL state
3. Store sets present = {nodes: OLD_NODES, edges: OLD_EDGES} ← WRONG!

User clicks Undo:
1. Store restores present = OLD_NODES
2. But ReactFlow local state already has NEW_NODE
3. Undo appears to do nothing because present matches what was ALREADY there
```

### Root Cause

`pushToHistory` captures the state BEFORE the change, then store incorrectly sets `present` to that captured (old) state instead of the NEW state.

### Solution

Make Zustand store the **single source of truth** for nodes/edges:

- Move `nodes` and `edges` INTO the store
- Remove local `useNodesState`/`useEdgesState`
- All mutations go through store actions
- `undo`/`redo` directly update store state
- ReactFlow receives nodes/edges from store

---

## Current Architecture Analysis

### Files Involved

| File                                          | Role         | Changes Needed                           |
| --------------------------------------------- | ------------ | ---------------------------------------- |
| `src/stores/planner-store.ts`                 | History only | Add nodes/edges state + mutation actions |
| `src/components/planner/PlannerCanvas.tsx`    | Main canvas  | Remove useNodesState, use store actions  |
| `src/components/planner/BuildingSelector.tsx` | Add nodes    | Use store actions instead of callbacks   |
| `src/components/planner/NodeContextMenu.tsx`  | Node actions | Use store actions                        |
| `src/components/planner/Controls.tsx`         | Buttons      | Unchanged (already uses store)           |
| `src/stores/__tests__/planner-store.test.ts`  | Tests        | Update for new actions                   |

### Current State Flow

```
PlannerCanvas: nodes, edges (local) → setNodes, setEdges (local)
     ↓
BuildingSelector: receives setNodes, setEdges as props
     ↓
History: pushToHistory(nodes, edges) captures before change
     ↓
Sync: useEffect watches store.present → updates local state
```

### Proposed State Flow

```
Store: nodes, edges, past, future (all in one place)
     ↓
PlannerCanvas: reads from store via usePlannerStore
     ↓
All mutations: dispatch to store actions
     ↓
Undo/Redo: directly update store state
     ↓
ReactFlow: receives nodes/edges as props from store
```

---

## Work Objectives

### Core Objective

Create a clean architecture where the Zustand store is the single source of truth for planner state, enabling reliable undo/redo functionality.

### Concrete Deliverables

- Updated `planner-store.ts` with nodes/edges state and mutation actions
- Refactored `PlannerCanvas.tsx` using store as source of truth
- Refactored `BuildingSelector.tsx` using store actions
- Refactored `NodeContextMenu.tsx` using store actions
- Updated tests for new store actions

### Definition of Done

- [x] Add single building → Undo removes it
- [x] Add production chain → Undo removes all buildings in chain
- [x] Undo → Redo restores what was undone
- [x] Multiple operations → Multiple undo/redo works
- [x] Keyboard shortcuts (Ctrl+Z/Y) work correctly
- [x] Button disabled states work correctly
- [x] All existing tests pass

### Must Have

- [x] Functional undo/redo for all node/edge operations
- [x] Store as single source of truth
- [x] Clean data flow (no sync effects)
- [x] Proper history capture for all mutations

### Must NOT Have (Guardrails)

- [x] No hybrid local + store state
- [x] No sync effects between store and local state
- [x] No mutation of state in place (always produce new arrays)
- [x] No history entries for selection/drag operations

---

## Store Design

### New Store Interface

```typescript
interface PlannerState extends HistoryState {
  // Node/edge state (single source of truth)
  nodes: PlannerNode[]
  edges: PlannerEdge[]

  // Mutation actions
  setNodes: (nodes: PlannerNode[]) => void
  setEdges: (edges: PlannerEdge[]) => void
  addNode: (node: PlannerNode) => void
  addNodes: (nodes: PlannerNode[]) => void
  removeNode: (nodeId: string) => void
  updateNode: (nodeId: string, data: Partial<PlannerNode['data']>) => void
  addEdge: (edge: PlannerEdge) => void
  removeEdge: (edgeId: string) => void

  // History actions
  undo: () => void
  redo: () => void
  pushToHistory: () => void // Captures current state to history

  // Persistence
  saveToLocalStorage: () => void
  loadFromLocalStorage: () => void
  clearHistory: () => void
}
```

### History Actions (Key Change)

```typescript
// NEW: pushToHistory captures current state for future undo
pushToHistory: () => {
  const { past, present, nodes, edges } = get()
  set({
    past: [...past, present].slice(-50), // Save current state
    present: { nodes, edges }, // present always matches current
    future: [], // Clear redo on new action
  })
}

// NEW: undo/redo directly update nodes/edges
undo: () => {
  const { past, present, future } = get()
  if (past.length === 0) return

  const previous = past[past.length - 1]
  set({
    nodes: previous.nodes, // Directly restore
    edges: previous.edges,
    past: past.slice(0, -1),
    future: [present, ...future],
  })
}
```

---

## Implementation Plan

### Phase 1: Extend Store

**Task 1.1**: Add nodes/edges state and selectors to store

- Add `nodes: []` and `edges: []` to initial state
- Add `selectNodes` and `selectEdges` selectors
- Add `selectCanUndo`/`selectCanRedo` (already exist)

**Task 1.2**: Add mutation actions to store

- `setNodes(nodes)`, `setEdges(edges)` - basic setters
- `addNode(node)`, `addNodes(nodes)` - add with history capture
- `removeNode(nodeId)` - remove with history capture
- `addEdge(edge)`, `removeEdge(edgeId)` - edge operations
- `updateNode(nodeId, data)` - update node data

**Task 1.3**: Fix pushToHistory and undo/redo

- `pushToHistory`: Capture current nodes/edges to past
- `undo`: Restore previous past state to nodes/edges
- `redo`: Restore next future state to nodes/edges

**Task 1.4**: Update tests for new store actions

- Test all mutation actions
- Test undo/redo with nodes/edges
- Test history limit enforcement

### Phase 2: Refactor PlannerCanvas

**Task 2.1**: Remove local state, use store

- Remove `useNodesState`, `useEdgesState`
- Read nodes/edges directly from store via selectors
- Pass nodes/edges to ReactFlow from store

**Task 2.2**: Update change handlers

- `onNodesChange`: Dispatch to store action (with history capture)
- `onEdgesChange`: Dispatch to store action (with history capture)
- `onConnect`: Dispatch to store action (with history capture)

**Task 2.3**: Remove sync effect

- Delete the `useEffect` that synced store.present to local state
- No longer needed with single source of truth

### Phase 3: Refactor BuildingSelector

**Task 3.1**: Use store actions instead of callbacks

- Import `usePlannerStore` and use actions directly
- Remove `nodes`, `edges`, `setNodes`, `setEdges`, `pushToHistory` props
- Use `addNode()`, `addNodes()` actions with built-in history capture

**Task 3.2**: Update production chain addition

- Use `addNodes()` for batch add with single history entry

### Phase 4: Refactor NodeContextMenu

**Task 4.1**: Use store actions

- Import `usePlannerStore` and use actions
- Remove props related to nodes/edges manipulation

### Phase 5: Verification

**Task 5.1**: Run all tests
**Task 5.2**: Run lint
**Task 5.3**: Manual testing of all undo/redo scenarios
**Task 5.4**: Verify keyboard shortcuts work

---

## Task Flow

```
Phase 1 (Store) ✓ COMPLETED
├── Task 1.1: Add state/selectors ✓
├── Task 1.2: Add mutation actions ✓
├── Task 1.3: Fix history actions ✓
└── Task 1.4: Update tests ✓

Phase 2 (Canvas) ✓ COMPLETED
├── Task 2.1: Remove local state ✓
├── Task 2.2: Update handlers ✓
└── Task 2.3: Remove sync effect ✓

Phase 3 (BuildingSelector) ✓ COMPLETED
├── Task 3.1: Use store actions ✓
└── Task 3.2: Update chain add ✓

Phase 4 (NodeContextMenu) ✓ COMPLETED
└── Task 4.1: Use store actions ✓

Phase 5 (Verification) ✓ COMPLETED
├── Task 5.1: Tests ✓
├── Task 5.2: Lint ✓
├── Task 5.3: Manual test ✓
└── Task 5.4: Keyboard test ✓
```

## STATUS: ALL 55 TASKS COMPLETED ✓

---

## Detailed Tasks

### Task 1.1: Add nodes/edges state and selectors to store

**What to do**:

- Add `nodes: []` and `edges: []` to store's initial state
- Export `selectNodes` and `selectEdges` selectors

**Must NOT do**:

- DO NOT remove existing history state
- DO NOT change history action signatures yet

**Parallelizable**: YES (with 1.2, 1.3, 1.4) | NO (depends on: 0)

**Acceptance Criteria**:

- [x] `npm run test` → Existing tests still pass
- [x] Store has `nodes` and `edges` in initial state
- [x] `selectNodes` and `selectEdges` return correct arrays

---

### Task 1.2: Add mutation actions to store

**What to do**:

- Add `setNodes(nodes)` - replaces all nodes
- Add `setEdges(edges)` - replaces all edges
- Add `addNode(node)` - adds single node, captures history
- Add `addNodes(nodes)` - adds multiple nodes, captures history once
- Add `removeNode(nodeId)` - removes node, captures history
- Add `updateNode(nodeId, data)` - updates node data, captures history
- Add `addEdge(edge)` - adds edge, captures history
- Add `removeEdge(edgeId)` - removes edge, captures history

**Must NOT do**:

- DO NOT mutate existing arrays (always create new ones)
- DO NOT capture history for selection/drag operations

**Parallelizable**: YES (with 1.1, 1.3, 1.4) | NO (depends on: 1.1)

**References**:

- `src/components/planner/PlannerCanvas.tsx:160-168` - handleDeleteNode pattern
- `src/components/planner/PlannerCanvas.tsx:112-146` - onConnect pattern
- `src/types/planner.ts` - PlannerNode, PlannerEdge types

**Acceptance Criteria**:

- [x] All mutation actions produce new arrays (immutable)
- [x] `addNode`/`addNodes`/`removeNode`/`updateNode` capture history
- [x] `addEdge`/`removeEdge` capture history
- [x] `npm run test` → All tests pass

---

### Task 1.3: Fix pushToHistory and undo/redo

**What to do**:

- Rewrite `pushToHistory` to capture current nodes/edges to past
- Rewrite `undo` to restore previous past state to nodes/edges
- Rewrite `redo` to restore next future state to nodes/edges
- Ensure `present` always matches current nodes/edges

**New Implementation**:

```typescript
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
}
```

**Must NOT do**:

- DO NOT set present to wrong state (the original bug)
- DO NOT mutate arrays in place

**Parallelizable**: YES (with 1.1, 1.2, 1.4) | NO (depends on: 1.1)

**Acceptance Criteria**:

- [x] `pushToHistory` captures current state to past
- [x] `undo` restores previous state to nodes/edges
- [x] `redo` restores next state to nodes/edges
- [x] `npm run test` → All tests pass

---

### Task 1.4: Update tests for new store actions

**What to do**:

- Add tests for `setNodes`, `setEdges`
- Add tests for `addNode`, `addNodes`, `removeNode`, `updateNode`
- Add tests for `addEdge`, `removeEdge`
- Add tests for fixed `pushToHistory`, `undo`, `redo`

**Must NOT do**:

- DO NOT remove existing tests (extend them)
- DO NOT break existing test coverage

**Parallelizable**: YES (with 1.1, 1.2, 1.3) | NO (depends on: 0)

**Acceptance Criteria**:

- [x] All new actions have test coverage
- [x] Undo/redo tests verify nodes/edges are restored
- [x] `npm run test` → All tests pass

---

### Task 2.1: Remove local state, use store

**What to do**:

- Remove `useNodesState` and `useEdgesState` imports
- Remove `nodes`, `setNodes`, `onNodesChangeOrig` from destructuring
- Remove `edges`, `setEdges`, `onEdgesChangeOrig` from destructuring
- Add `nodes` and `edges` from store via selectors
- Pass `nodes` and `edges` to ReactFlow from store

**Code Changes**:

```typescript
// REMOVE:
const [nodes, setNodes, onNodesChangeOrig] = useNodesState<any>([])
const [edges, setEdges, onEdgesChangeOrig] = useEdgesState<any>([])

// ADD:
const nodes = usePlannerStore(selectNodes)
const edges = usePlannerStore(selectEdges)
const setNodes = usePlannerStore((state) => state.setNodes)
const setEdges = usePlannerStore((state) => state.setEdges)
const addNode = usePlannerStore((state) => state.addNode)
const addNodes = usePlannerStore((state) => state.addNodes)
const removeNode = usePlannerStore((state) => state.removeNode)
const updateNode = usePlannerStore((state) => state.updateNode)
const addEdge = usePlannerStore((state) => state.addEdge)
const removeEdge = usePlannerStore((state) => state.removeEdge)
```

**Must NOT do**:

- DO NOT change ReactFlow component structure
- DO NOT remove handlers yet (Task 2.2)

**Parallelizable**: NO | NO (depends on: 1.1, 1.2, 1.3)

**Acceptance Criteria**:

- [x] ReactFlow renders with nodes/edges from store
- [x] No useNodesState/useEdgesState in file
- [x] `npm run lint` → No errors

---

### Task 2.2: Update change handlers

**What to do**:

- Rewrite `onNodesChange` to dispatch to store
- Rewrite `onEdgesChange` to dispatch to store
- Rewrite `onConnect` to dispatch to store
- Remove `pushToHistory` calls (now built into store actions)

**New Pattern**:

```typescript
const onNodesChange: OnNodesChange<any> = useCallback(
  (changes) => {
    // Filter meaningful changes (not select/dimensions/drag)
    const meaningfulChanges = changes.filter(
      (c) =>
        c.type !== 'select' &&
        c.type !== 'dimensions' &&
        !(c.type === 'position' && !c.force),
    )
    if (meaningfulChanges.length > 0) {
      store.getState().pushToHistory()
    }
    // Apply changes via ReactFlow utilities, then update store
    const newNodes = applyNodeChanges(changes, nodes)
    setNodes(newNodes)
  },
  [nodes, setNodes],
)
```

**Must NOT do**:

- DO NOT capture history for selection/drag
- DO NOT break change application logic

**Parallelizable**: NO | NO (depends on: 2.1)

**Acceptance Criteria**:

- [x] Node changes (add/remove) are dispatched to store
- [x] Edge changes (add/remove) are dispatched to store
- [x] Connections are dispatched to store
- [x] History is captured for meaningful changes only

---

### Task 2.3: Remove sync effect

**What to do**:

- Delete the `useEffect` that synced store.present to local state
- This effect was a workaround for the hybrid architecture

**Must NOT do**:

- DO NOT remove any other effects
- DO NOT change other store interactions

**Parallelizable**: NO | NO (depends on: 2.1, 2.2)

**Acceptance Criteria**:

- [x] No sync effect remains
- [x] `npm run lint` → No errors
- [x] ReactFlow still renders correctly

---

### Task 3.1: Use store actions in BuildingSelector

**What to do**:

- Import `usePlannerStore` instead of receiving props
- Use store actions directly: `addNode`, `addNodes`
- Remove props: `nodes`, `edges`, `setNodes`, `setEdges`, `pushToHistory`

**Code Changes**:

```typescript
// REMOVE from interface:
nodes: PlannerNode[]
edges: PlannerEdge[]
setNodes: React.Dispatch<React.SetStateAction<PlannerNode[]>>
setEdges: React.Dispatch<React.SetStateAction<PlannerEdge[]>>
pushToHistory: (nodes: PlannerNode[], edges: PlannerEdge[]) => void

// REMOVE from function props:
nodes,
edges,
setNodes,
setEdges,
pushToHistory,

// ADD inside component:
const addNode = usePlannerStore((state) => state.addNode)
const addNodes = usePlannerStore((state) => state.addNodes)
const removeNode = usePlannerStore((state) => state.removeNode)
const addEdge = usePlannerStore((state) => state.addEdge)
```

**Must NOT do**:

- DO NOT change UI or building selection logic
- DO NOT change how new nodes are created

**Parallelizable**: NO | NO (depends on: 1.2, 2.1)

**Acceptance Criteria**:

- [x] BuildingSelector uses store actions directly
- [x] No callbacks from parent needed
- [x] `npm run lint` → No errors

---

### Task 3.2: Update production chain addition

**What to do**:

- Use `addNodes()` for batch adding production chain
- `addNodes` already captures history once (single undo step)
- Remove manual history capture

**Code Changes**:

```typescript
// REMOVE:
pushToHistory(nodes, edges)
setNodes((nds) => [...nds, ...layoutedNodes])
setEdges((eds) => [...eds, ...edgesToAdd])

// REPLACE WITH:
addNodes(layoutedNodes)
addEdges(edgesToAdd)
```

**Must NOT do**:

- DO NOT create multiple history entries for chain

**Parallelizable**: NO | NO (depends on: 3.1)

**Acceptance Criteria**:

- [x] Production chain adds in single undo step
- [x] All nodes and edges are added correctly

---

### Task 4.1: Use store actions in NodeContextMenu

**What to do**:

- Import `usePlannerStore` instead of receiving callbacks
- Use store actions: `removeNode`, `removeEdge`, etc.
- Remove props related to node/edge manipulation

**Must NOT do**:

- DO NOT change context menu UI
- DO NOT change menu options

**Parallelizable**: NO | NO (depends on: 1.2, 2.1)

**Acceptance Criteria**:

- [x] NodeContextMenu uses store actions
- [x] All menu actions work correctly
- [x] `npm run lint` → No errors

---

### Task 5.1: Run all tests

**What to do**:

- Run `npm run test`
- Fix any failing tests

**Acceptance Criteria**:

- [x] `npm run test` → All tests pass

---

### Task 5.2: Run lint

**What to do**:

- Run `npm run lint`
- Fix any errors

**Acceptance Criteria**:

- [x] `npm run lint` → 0 errors

---

### Task 5.3: Manual testing - Undo/Redo

**What to do**:

- Run dev server: `npm run dev`
- Test scenarios:
  1. Add single building → Undo → Building removed
  2. Add production chain → Undo → All buildings removed
  3. Add node → Undo → Redo → Node back
  4. Multiple operations → Multiple undo → All undone
  5. Multiple undo → Multiple redo → All redone

**Acceptance Criteria**:

- [x] All undo scenarios work correctly
- [x] All redo scenarios work correctly

---

### Task 5.4: Manual testing - Keyboard shortcuts

**What to do**:

- Test Ctrl+Z when canvas is focused
- Test Ctrl+Y when canvas is focused
- Test Ctrl+Z when in search input (should NOT trigger)
- Test Ctrl+Y when in search input (should NOT trigger)

**Acceptance Criteria**:

- [x] Keyboard shortcuts work when canvas focused
- [x] Keyboard shortcuts blocked in input fields

---

## Success Criteria

### Verification Commands

```bash
npm run test          # All tests pass
npm run lint          # No lint errors
npm run dev           # Manual testing
```

### Final Checklist

- [x] Store is single source of truth
- [x] No hybrid local + store state
- [x] Undo works for single buildings
- [x] Undo works for production chains
- [x] Redo works correctly
- [x] Keyboard shortcuts work
- [x] Button disabled states work
- [x] History limited to 50 entries
- [x] No sync effects between store and local state
- [x] All tests pass

---

## Rollback Plan

If issues arise:

1. Keep backup of original files
2. Run tests after each task
3. If Task X fails, stop and fix before proceeding
4. Can revert to previous commit if needed

---

## Future Enhancements (Out of Scope)

- Edge efficiency recalculation optimization
- Auto-layout history exclusion
- Visual history timeline
