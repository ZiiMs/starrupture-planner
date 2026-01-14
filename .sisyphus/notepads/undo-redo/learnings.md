# Undo/Redo Implementation Learnings

## Overview

Successfully implemented undo/redo history for the ReactFlow-based planner canvas using Zustand.

## Key Decisions Made

### 1. History Capture Strategy

**Decision**: Capture history BEFORE state mutations in ReactFlow handlers
**Reasoning**: ReactFlow's `onNodesChange`, `onEdgesChange`, and `onConnect` provide change objects that describe what WILL happen. Capturing history before applying these changes ensures we snapshot the correct "before" state.

### 2. Filtering vs. Capturing on Every Change

**Decision**: Filter out selection/drag events from triggering history
**Reasoning**:

- `onNodesChange` fires for: selection changes, position changes (drag), dimension changes, remove, add
- We only want to capture when USER makes meaningful changes (add, remove, connect, recipe change)
- Selection changes during drag operations create excessive noise in history
- Dragging during selection is temporary, not a committed state change

**Implementation**: Check `change.type` before calling `pushToHistory`:

```typescript
if (change.type === 'add' || change.type === 'remove') {
  pushToHistory(nodes, edges)
}
```

### 3. Production Chain Batch Operations

**Decision**: Capture history ONCE before adding all nodes/edges for a production chain
**Reasoning**:

- A production chain creates 3-5+ nodes and multiple edges
- Each should be a single undo step, not N separate steps
- This matches user mental model: "I added a production chain" vs "I added N nodes"

**Implementation**: Call `pushToHistory()` once before the batch update:

```typescript
if (layoutedNodes.length > 0) {
  pushToHistory() // Single capture before batch
  setNodes((nds) => [...nds, ...layoutedNodes])
  setEdges((eds) => [...eds, ...edgesToAdd])
}
```

### 4. Skipping Auto-Layout and Efficiency Calculations

**Decision**: Do NOT capture history for:

- Initial auto-layout application
- Edge efficiency recalculations
  **Reasoning**:
- These are derived/calculated states, not user actions
- Undoing efficiency calculations would be confusing
- Auto-layout is a positioning operation, not a data change

## Patterns Discovered

### Pattern 1: Local State + Store Integration

The canvas uses local `useNodesState`/`useEdgesState` while the store manages history. This required:

- Passing `setNodes`/`setEdges` to child components (BuildingSelector)
- Capturing current state from local hooks before mutations
- Syncing store's `present` state with local state after undo/redo

### Pattern 2: Selector Functions for Reactive UI

```typescript
export const selectCanUndo = (state: PlannerState) => state.past.length > 0
export const selectCanRedo = (state: PlannerState) => state.future.length > 0
// Usage in component:
const canUndo = usePlannerStore(selectCanUndo)
```

### Pattern 3: Keyboard Shortcut Focus Check

```typescript
const target = e.target as HTMLElement
if (
  target.tagName === 'INPUT' ||
  target.tagName === 'TEXTAREA' ||
  target.isContentEditable
) {
  return // Don't trigger when typing
}
```

## Gotchas Encountered

### Gotcha 1: BuildingSelector Bypassing Local State

**Problem**: `BuildingSelector` used `useReactFlow().addNodes()` directly, bypassing the local `setNodes`
**Solution**: Refactored to accept `setNodes` and `setEdges` as props from parent

### Gotcha 2: Empty Nodes Parameter Warning

**Problem**: After refactor, `nodes` prop was declared but never used in BuildingSelector
**Solution**: Renamed to `_nodes` to indicate intentional unused parameter for future compatibility

### Gotcha 3: ReactFlow Change Objects vs State Snapshot

**Problem**: `onNodesChange` provides change objects, not current state
**Solution**: Access current `nodes` and `edges` from local state refs before applying changes

## Commands Verified

```bash
npm run test     # 6 tests pass
npm run lint     # 0 errors (1 pre-existing warning)
npm run format:check  # No formatting issues
```

## Files Modified

- `src/stores/planner-store.ts` - Added `pushToHistory` action
- `src/stores/__tests__/planner-store.test.ts` - 6 unit tests
- `src/components/planner/PlannerCanvas.tsx` - History capture wrappers
- `src/components/planner/BuildingSelector.tsx` - Local state integration
- `src/components/planner/Controls.tsx` - Button disabled states + keyboard shortcuts

## Future Enhancements (Out of Scope)

- Save/Load with history persistence
- Visual history timeline dropdown
- Ctrl+Shift+Z as alternative redo
- History persistence to localStorage
