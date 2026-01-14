# Debug: Infinite Update Loop Issue

## Problem

React error: "Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate."

## Root Cause Analysis

### Issue #1: Layout Effect Loop (Lines 291-300)

```typescript
useEffect(() => {
  if (nodes.length > previousNodesLengthRef.current) {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges,
      'LR',
    )
    setNodes(layoutedNodes as any) // ← TRIGGERS RE-RENDER
    setEdges(layoutedEdges as any) // ← TRIGGERS RE-RENDER
    setTimeout(() => fitView({ padding: 0.1 }), 100)
  }
  previousNodesLengthRef.current = nodes.length
}, [nodes.length, nodes, edges, setNodes, setEdges, fitView])
```

**Problem**: Effect calls `setNodes`/`setEdges` which update Zustand store → component re-renders → `nodes`/`edges` from store change → effect runs again.

**Why it loops**:

1. Layouted nodes may have same `length` as original nodes
2. Condition checks `nodes.length > previousNodesLengthRef.current` but...
3. After `setNodes(layoutedNodes)`, ReactFlow may merge/transform nodes internally
4. Next render gets different node array (different references, same length)
5. Effect runs again because `nodes` dependency changed

### Issue #2: Edge Efficiency Effect Loop (Lines 326-379)

```typescript
useEffect(() => {
  if (!nodesChanged) return  // ← Check is flawed

  const currentEdges = usePlannerStore.getState().present.edges
  let hasChanges = false
  const updatedEdges = currentEdges.map((edge: any) => {
    const edgeData = calculateEdgeEfficiencyData(...)
    if (edgeData) {
      const needsUpdate = edge.data?.itemId !== edgeData.itemId || ...
      if (needsUpdate) {
        hasChanges = true
        return { ...edge, data: { ...edge.data, ...edgeData } }
      }
    }
    return edge
  })
  if (hasChanges) {
    setEdges(updatedEdges)  // ← TRIGGERS RE-RENDER
  }
}, [nodes, plannerData, setEdges])
```

**Problem**: When `setEdges` is called, it updates the store → component re-renders → `nodes` may be recalculated → effect runs again.

**Why it loops**:

1. Edge data update triggers store update
2. Store update may affect node data through some side effect
3. Or the `nodes` reference changes even if content is same
4. Effect runs again because `nodes` dependency changed

## Why This Works on Other Branches

The previous architecture (before commit `3bc500a`) used:

- Local `useNodesState()` / `useEdgesState()` from ReactFlow
- No useEffect that called set functions
- State was managed entirely by ReactFlow, no custom effects

The refactor introduced direct store integration but the effects weren't properly guarded.

## Solution Needed

Both effects need:

1. **Proper comparison**: Compare actual content, not just array references
2. **Guard against loops**: Track previous values and only update if truly different
3. **Or remove entirely**: Move logic to where the state change originates

## Affected Files

- `src/components/planner/PlannerCanvas.tsx` (lines 291-300, 326-379)

## Related Commits

- `3bc500a` - "refactor(planner): establish single source of truth with Zustand store" - WHERE THE BUG WAS INTRODUCED
- `8f7a780` - "fix(store): ensure hydration triggers React re-render" - Related fix
