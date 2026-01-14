# Store as Single Source of Truth - Implementation Learnings

## Overview

Successfully refactored the planner to use Zustand store as single source of truth for undo/redo functionality.

## The Bug (Root Cause)

**Original Architecture (Broken):**

```
User adds building:
1. pushToHistory(nodes, edges) ← captures OLD state
2. setNodes([...nodes, newNode]) ← updates ReactFlow LOCAL state
3. Store sets present = {nodes: OLD_NODES, edges: OLD_EDGES} ← WRONG!

User clicks Undo:
1. Store restores present = OLD_NODES
2. But ReactFlow local state already has NEW_NODE
3. Undo appears to do nothing
```

The bug: `pushToHistory(oldNodes, oldEdges)` was called BEFORE the change, then store set `present` to that OLD state instead of the NEW state. When undo ran, it restored what was ALREADY there.

## The Fix

**New Architecture (Correct):**

```
Store: nodes, edges, past, future (single source of truth)

addNode(node):
1. pushToHistory() ← capture CURRENT state first
2. set({ nodes: [...nodes, node] }) ← then update

undo():
1. Get previous state from past[past.length - 1]
2. set({ nodes: previous.nodes, edges: previous.edges }) ← restore directly
```

Key insight: `pushToHistory()` now takes NO parameters and captures the current state before mutation. Undo/redo directly update `nodes` and `edges`.

## Key Implementation Details

### 1. Store Actions with Built-in History

```typescript
addNode: (node: PlannerNode) => {
  get().pushToHistory() // Capture BEFORE mutation
  const { nodes } = get()
  set({ nodes: [...nodes, node] }) // Then mutate
}
```

### 2. Undo/Redo Directly Update State

```typescript
undo: () => {
  const { past, nodes, edges, future } = get()
  if (past.length === 0) return

  const previous = past[past.length - 1]
  set({
    nodes: previous.nodes, // Direct restore
    edges: previous.edges,
    past: past.slice(0, -1),
    future: [{ nodes, edges }, ...future],
  })
}
```

### 3. No Sync Effects Needed

With store as single source of truth, no `useEffect` sync between store and local state is needed. ReactFlow receives `nodes` and `edges` directly from store via selectors.

## Patterns Discovered

### Pattern 1: Always Capture History Before Mutation

```typescript
// WRONG:
setNodes(newNodes)
pushToHistory() // Too late - already mutated

// CORRECT:
pushToHistory() // Capture current state
setNodes(newNodes) // Then mutate
```

### Pattern 2: Store Actions Handle History Internally

```typescript
// Instead of external pushToHistory calls:
handleDeleteNode: () => {
  pushToHistory(nodes, edges) // OLD pattern
  setNodes(filtered)
}

// New pattern - action handles it:
handleDeleteNode: () => {
  removeNode(menu.id) // Built-in history capture
}
```

### Pattern 3: usePlannerStore Selectors for Reactive Updates

```typescript
const nodes = usePlannerStore(selectNodes)
const addNode = usePlannerStore((state) => state.addNode)
```

## Files Modified

| File                                          | Changes                                                                 |
| --------------------------------------------- | ----------------------------------------------------------------------- |
| `src/stores/planner-store.ts`                 | Added nodes/edges state, mutation actions with history, fixed undo/redo |
| `src/components/planner/PlannerCanvas.tsx`    | Removed local state, uses store directly                                |
| `src/components/planner/BuildingSelector.tsx` | Uses store actions directly                                             |
| `src/stores/__tests__/planner-store.test.ts`  | 9 tests for new architecture                                            |

## Verification Results

```bash
npm run lint  ✅ 0 errors
npm run test  ✅ 9/9 tests pass
```

## Future Enhancements (Out of Scope)

- Edge efficiency recalculation optimization
- Auto-layout history exclusion
- Visual history timeline
- History persistence to localStorage

## Rollback Plan

If issues arise:

1. Can revert to previous commit
2. Tests provide safety net
3. Incremental approach allowed pausing at any phase
