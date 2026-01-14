# Fix Infinite Loop Issue in PlannerCanvas

**Created:** 2026-01-13
**Issue:** "Maximum update depth exceeded" error when component repeatedly calls setState in useEffect

## Problem Statement

Two useEffect hooks in `src/components/planner/PlannerCanvas.tsx` are causing infinite update loops:

1. **Layout Effect (lines 291-300)** - Updates nodes/edges when new nodes are added, but dependencies include `nodes`/`edges` which change when set functions are called
2. **Edge Efficiency Effect (lines 326-379)** - Updates edge data when nodes change, but dependencies include `nodes` which triggers re-renders

## Root Cause

Commit `3bc500a` refactored the canvas to use Zustand store but didn't properly guard the useEffect hooks. Both effects call store setter functions (`setNodes`, `setEdges`) but have the store state (`nodes`, `edges`) as dependencies, creating a loop:

```
setNodes() → store updates → component re-renders → nodes changes → effect runs → setNodes()
```

## Plan

### Phase 1: Fix Layout Effect Loop

- [ ] Read current layout effect implementation (lines 291-300)
- [ ] Add proper guard to prevent redundant layout calls
- [ ] Track layout state separately from nodes
- [ ] Remove nodes/edges from effect dependencies
- [ ] Test: Add node → should layout once, not infinitely

### Phase 2: Fix Edge Efficiency Loop

- [ ] Read current edge efficiency effect (lines 326-379)
- [ ] Analyze what triggers the loop (nodes reference vs content)
- [ ] Add proper comparison logic (content-based, not reference-based)
- [ ] Track previous edge state to avoid redundant updates
- [ ] Consider moving logic to edge update handlers instead of useEffect
- [ ] Test: Change node data → edge data updates once, not infinitely

### Phase 3: Integration Testing

- [ ] Run the dev server and verify no infinite loop errors
- [ ] Test: Add/remove nodes
- [ ] Test: Change recipe on node
- [ ] Test: Connect nodes
- [ ] Test: Undo/redo operations
- [ ] Verify canvas still functions correctly

## Technical Approach

### Fix 1: Layout Effect

Current problematic pattern:

```typescript
useEffect(() => {
  if (nodes.length > previousNodesLengthRef.current) {
    setNodes(layoutedNodes) // BUG: triggers re-render
    setEdges(layoutedEdges) // BUG: triggers re-render
  }
}, [nodes.length, nodes, edges, setNodes, setEdges, fitView])
```

Proposed fix:

```typescript
const [isLayouting, setIsLayouting] = useState(false)
useEffect(() => {
  if (isLayouting || nodes.length <= previousNodesLengthRef.current) return

  setIsLayouting(true)  // Prevent re-entry
  const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(...)
  setNodes(layoutedNodes)
  setEdges(layoutedEdges)

  // Layout only once after node count change
  setTimeout(() => {
    setIsLayouting(false)
    fitView({ padding: 0.1 })
  }, 100)
}, [nodes.length])  // Only depend on length, not nodes array
```

### Fix 2: Edge Efficiency Effect

Current problematic pattern:

```typescript
useEffect(() => {
  if (!nodesChanged) return
  // ... calculate and set edges ...
  if (hasChanges) setEdges(updatedEdges) // BUG: triggers re-render
}, [nodes, plannerData, setEdges])
```

Proposed fix options:

**Option A: Track previous edges**

```typescript
const prevEdgesRef = useRef<PlannerEdge[]>([])
useEffect(() => {
  const currentEdges = usePlannerStore.getState().present.edges

  // Check if edges actually need updating (content comparison)
  const edgesNeedUpdate = currentEdges.some((edge, i) => {
    const prev = prevEdgesRef.current[i]
    if (!prev) return true
    return JSON.stringify(prev.data) !== JSON.stringify(edge.data)
  })

  if (edgesNeedUpdate && nodes.length > 0 && plannerData) {
    // Calculate and update
    setEdges(calculatedEdges)
  }

  prevEdgesRef.current = currentEdges
}, [nodes.length]) // Only on count change
```

**Option B: Move logic to edge update handlers**

- Don't use useEffect for edge data calculation
- Calculate edge data when edges are created/modified (onConnect, etc.)
- Store edge data as part of the edge object initially

## Success Criteria

- [ ] No "Maximum update depth exceeded" errors
- [ ] Layout applies correctly when nodes are added
- [ ] Edge efficiency data updates correctly when node data changes
- [ ] No performance degradation (no unnecessary re-renders)
- [ ] All existing functionality preserved

## Files to Modify

- `src/components/planner/PlannerCanvas.tsx` (lines 291-379)

## Testing Commands

```bash
npm run dev     # Start dev server and test manually
npm run build   # Verify no build errors
npm run check   # Run linter and formatter
```

## Related Commits

- `3bc500a` - refactor(planner): establish single source of truth with Zustand store (WHERE BUG WAS INTRODUCED)
- `8f7a780` - fix(store): ensure hydration triggers React re-render (Related)
- `50dd8c2` - fix(store): restore persistence formula (Related)

## Notes

- The root cause is a classic React anti-pattern: using state in useEffect dependencies while also updating that state in the effect
- The fix requires either removing the dependencies or adding proper guards
- Consider whether these calculations belong in useEffect at all, or should be done at the point of state mutation
