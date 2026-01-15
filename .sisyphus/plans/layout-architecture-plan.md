# Plan: Architectural Auto-Layout Lifecycle

**Generated:** 2026-01-14
**Issue:** Layout is fragmented, causing overlap issues after structural changes

---

## Problem Analysis

### Current State (Fragmented)

```
┌─────────────────────────────────────────────────────────────┐
│                    CURRENT FRAGMENTED FLOW                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐    ┌─────────────────────────────┐ │
│  │ BuildingSelector.tsx │    │    PlannerCanvas.tsx        │ │
│  │                     │    │                             │ │
│  │ addProductionChain()│    │  No layout function!        │ │
│  │    has local        │    │                             │ │
│  │    getLayoutedElements│    │  Nodes just stack          │ │
│  │    call             │    │  at (0, 0) or viewport     │ │
│  └──────────┬──────────┘    └──────────────┬──────────────┘ │
│             │                              │                 │
│             └──────────────┬───────────────┘                 │
│                            ↓                                 │
│                   ┌─────────────────┐                        │
│                   │   NO CENTRAL    │                        │
│                   │   LAYOUT API    │                        │
│                   └─────────────────┘                        │
│                                                             │
│  Problems:                                                   │
│  ❌ Layout duplicated in addProductionChain only            │
│  ❌ Manual node placement never laid out                    │
│  ❌ Recipe changes don't trigger re-layout                  │
│  ❌ Node height changes cause overlaps                      │
│  ❌ No "Auto Layout" button exists                          │
└─────────────────────────────────────────────────────────────┘
```

### Root Cause

**Missing Layout Lifecycle** — not a math problem.

Dagre correctly calculates positions given node dimensions. The issue is:

1. No centralized function to call
2. No triggers for structural changes
3. No manual re-layout option for users

---

## Solution: Centralized Layout Architecture

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PLANNER CANVAS (Layout Orchestrator)             │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  const runAutoLayout = useCallback((direction) => {          │   │
│  │    const { nodes, edges } = getLayoutedElements(             │   │
│  │      currentNodes,                                           │   │
│  │      currentEdges,                                           │   │
│  │      direction                                               │   │
│  │    )                                                         │   │
│  │    updateNodePositions(nodes)                                │   │
│  │    updateEdgePositions(edges)                                │   │
│  │  }, [currentNodes, currentEdges])                            │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│              ┌───────────────┼───────────────┐                      │
│              ↓               ↓               ↓                      │
│     ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│     │ Production   │ │   Auto       │ │  Structural  │             │
│     │ Chain Add    │ │   Layout     │ │  Mutations   │             │
│     └──────────────┘ └──────────────┘ └──────────────┘             │
└─────────────────────────────────────────────────────────────────────┘
```

### The Single Entry Point

```typescript
// In useAutoLayout hook or PlannerCanvas.tsx

const runAutoLayout = useCallback(
  (direction: 'LR' | 'TB' = 'LR') => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      currentNodes,
      currentEdges,
      direction,
    )

    batch(() => {
      setNodes(layoutedNodes)
      setEdges(layoutedEdges)
    })
  },
  [currentNodes, currentEdges],
)
```

---

## Implementation Plan

### Phase 1: Create Layout Hook (Infrastructure)

**Task 1.1: Create `useAutoLayout` hook**

```
src/hooks/useAutoLayout.ts (NEW)

Exports:
- runAutoLayout(direction): void
- autoLayoutDirection: 'LR' | 'TB'
- setAutoLayoutDirection(direction): void

Dependencies:
- usePlannerStore (nodes, edges, updateNodePositions)
- getLayoutedElements from dagre-layout
```

**Task 1.2: Export hook from hooks index**

```
src/hooks/index.ts

Add: export { useAutoLayout } from './useAutoLayout'
```

---

### Phase 2: Update Production Chain (Use Case A)

**Task 2.1: Remove local layout call from BuildingSelector**

```diff
- const { nodes: layoutedNodes } = getLayoutedElements(
-   nodesToAdd,
-   edgesToAdd,
-   'LR',
- )
-
- // Calculate offset, center, add nodes...
+ // Add all nodes first (temporarily at 0,0)
+ nodesToAdd.forEach((node) => addNode(node))
+ edgesToAdd.forEach((edge) => addEdge(edge))
+
+ // Then trigger centralized layout
+ runAutoLayout('LR')
```

**Task 2.2: Import and use hook**

```typescript
import { useAutoLayout } from '@/hooks/useAutoLayout'

const { runAutoLayout } = useAutoLayout()
```

---

### Phase 3: Add Auto Layout Button (Use Case B)

**Task 3.1: Add Layout Controls component**

```
src/components/planner/LayoutControls.tsx (NEW)

Features:
- Dropdown: Direction (LR / TB)
- Button: "Auto Layout"
- Button: "Center View"
- Tooltip: Explains what each does

Style:
- Position: Bottom-right (near Zoom controls)
- Icon: LayoutGrid or similar
```

**Task 3.2: Integrate into PlannerCanvas**

```typescript
// PlannerCanvas.tsx

import LayoutControls from './LayoutControls'

return (
  <ReactFlow
    nodes={nodes}
    edges={edges}
    // ... existing props
  >
    <Background />
    <Controls />
    <Minimap />
    <LayoutControls />  {/* NEW */}
    {/* ... existing children */}
  </ReactFlow>
)
```

---

### Phase 4: Handle Structural Mutations (Use Case C)

**Task 4.1: Identify structural mutation points**

| Mutation       | Trigger                    | Action                                   |
| -------------- | -------------------------- | ---------------------------------------- |
| Recipe change  | `handleRecipeChange`       | Update node, then `runAutoLayout()`      |
| Custom inputs  | `handleAddInputConnector`  | Update node, then `runAutoLayout()`      |
| Custom outputs | `handleAddOutputConnector` | Update node, then `runAutoLayout()`      |
| Batch import   | (future)                   | After all nodes added, `runAutoLayout()` |

**Task 4.2: Update handleRecipeChange in PlannerCanvas**

```typescript
const handleRecipeChange = useCallback(
  (nodeId: string, newRecipeId: string) => {
    pushToHistory()

    // ... existing recipe update logic ...

    // NEW: Trigger layout to account for height change
    runAutoLayout()
  },
  [pushToHistory /* ... other deps */, , runAutoLayout],
)
```

**Task 4.3: Update connector handlers similarly**

```typescript
const handleAddInputConnector = useCallback(() => {
  if (!menu?.id) return
  pushToHistory()
  // ... existing logic ...
  updateNode(menu.id, { customInputs: [...] })
  runAutoLayout()  // NEW
}, [/* ... */, runAutoLayout])
```

---

### Phase 5: Handle Node Height Changes

**Task 5.1: Understand the height change problem**

```
Dagre Layout:
┌─────────────┐
│   Node A    │  height: 200px (initial)
│  (2 inputs) │  rendered at y = 100
└─────────────┘
     ↓
User changes recipe:
┌─────────────┐
│   Node A    │  height: 344px (new)
│  (4 inputs) │  still at y = 100 → OVERLAP!
└─────────────┘
```

**Task 5.2: Always measure after recipe/connector changes**

```typescript
// In handleRecipeChange, after updateNode:

// Force ReactFlow to re-measure node dimensions
updateNode(nodeId, {
  recipeId: newRecipeId,
  // ... other updates
})

// Next render: ReactFlow measures actual height
// Then: runAutoLayout() picks up new height
```

**Task 5.3: Add measured height fallback in dagre-layout**

```typescript
// dagre-layout.ts

export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: 'LR' | 'TB' = 'TB',
): LayoutedElements {
  const dagreGraph = new dagre.graphlib.Graph()...

  nodes.forEach((node) => {
    // Priority: measured → estimated → default
    const width = node.measured?.width ?? estimateNodeHeight(node) ?? NODE_WIDTH
    const height = node.measured?.height ?? estimateNodeHeight(node) ?? 200
    dagreGraph.setNode(node.id, { width, height })
  })

  // ... rest of function
}
```

---

## Usage Points Summary

| Point                | Trigger                              | Direction     | Debounce |
| -------------------- | ------------------------------------ | ------------- | -------- |
| Production chain add | User clicks "Place Production Chain" | 'LR'          | No       |
| Auto Layout button   | User clicks button                   | User's choice | 300ms    |
| Recipe change        | User selects new recipe              | Current       | 500ms    |
| Connector change     | User adds/removes input/output       | Current       | 500ms    |
| Batch import         | (future feature)                     | 'LR' / 'TB'   | No       |

---

## Files to Modify/Create

### New Files

1. `src/hooks/useAutoLayout.ts` - Centralized layout hook
2. `src/components/planner/LayoutControls.tsx` - UI controls

### Modified Files

1. `src/components/planner/BuildingSelector.tsx` - Remove local layout, call hook
2. `src/components/planner/PlannerCanvas.tsx` - Add LayoutControls, update handlers
3. `src/lib/dagre-layout.ts` - Add measured height fallback

---

## Success Criteria

### Functional Requirements

1. [ ] Single `runAutoLayout()` function used everywhere
2. [ ] "Auto Layout" button visible and functional
3. [ ] Recipe changes trigger re-layout
4. [ ] Connector changes trigger re-layout
5. [ ] Production chain placement uses centralized layout

### Observable Behavior

- Nodes never overlap after any operation
- Layout respects actual node heights
- User can choose LR or TB direction
- Layout completes within 200ms for 50+ nodes

### Test Plan

**Test 1: Production chain placement**

```
Input: Select "Steel Ingot", rate 60/min, click "Place"
Expected: Nodes laid out left-to-right, no overlap
Verify: Visual inspection
```

**Test 2: Auto Layout button**

```
Input: Manually place 5 nodes, click "Auto Layout"
Expected: Nodes arranged with consistent spacing
Verify: Screenshot comparison
```

**Test 3: Recipe change causes height change**

```
Input: Node with 1 input → change to recipe with 4 inputs
Expected: Node expands, neighbors shift, no overlap
Verify: Screenshot comparison before/after
```

**Test 4: Rapid recipe changes (debounce)**

```
Input: Change recipe 5 times quickly
Expected: Only 1 layout run (debounced), no flicker
Verify: Console log layout calls
```

---

## Estimated Effort

| Phase                            | Effort  | Risk   |
| -------------------------------- | ------- | ------ |
| Phase 1: Hook creation           | 2 hours | Low    |
| Phase 2: Update production chain | 1 hour  | Low    |
| Phase 3: Add button              | 2 hours | Low    |
| Phase 4: Structural mutations    | 2 hours | Medium |
| Phase 5: Height handling         | 2 hours | Medium |

**Total:** 9-10 hours
**Risk Level:** Medium (behavior changes for users)

---

## Future Enhancements (Out of Scope)

- **Layout animation**: Animate nodes to new positions
- **Partial layout**: Only re-layout affected subgraph
- **Layout presets**: Different spacing strategies
- **Layout persistence**: Remember last direction choice
- **Keyboard shortcut**: Ctrl+Shift+L for quick layout
