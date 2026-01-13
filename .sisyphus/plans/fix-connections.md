# Work Plan: Fix Connection Limitation Issue

**Status:** Ready for Execution
**Created:** 2026-01-13
**Author:** Prometheus (Planner)

## Executive Summary

Add `connectionMode="loose"` to ReactFlow component to enable proper multi-handle behavior, preventing connections from disconnecting when interacting with different handles on the same node.

## Problem Statement

**Current Behavior:** When a node has multiple output handles, connecting one handle to another node, then attempting to connect a second handle to a different node causes the first connection to be disconnected.

**Root Cause:** ReactFlow's default `connectionMode="strict"` can cause unexpected disconnection behavior when working with multiple handles on the same node.

**Solution:** Set `connectionMode="loose"` on the ReactFlow component.

---

## Implementation Steps

### Step 1: Modify PlannerCanvas.tsx

**File:** `src/components/planner/PlannerCanvas.tsx`

**Current Code (Line ~311):**

```typescript
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        onNodeClick={onNodeClick}
```

**Required Change:**
Add `connectionMode="loose"` prop to the `<ReactFlow>` component.

**Expected Code:**

```typescript
      <ReactFlow
        connectionMode="loose"
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        onNodeClick={onNodeClick}
```

### Step 2: Verify Implementation

1. Run lint check: `npm run lint`
2. Run type check: `npm run check`
3. Build project: `npm run build`
4. Manual verification in browser:
   - Create a node with multiple output handles (e.g., Smelter with multiple outputs)
   - Connect first output to one node
   - Connect second output to another node
   - Verify both connections persist independently

---

## File Changes Summary

| File                                       | Change Type | Lines Affected |
| ------------------------------------------ | ----------- | -------------- |
| `src/components/planner/PlannerCanvas.tsx` | Modify      | ~311           |

---

## Verification Checklist

- [x] `connectionMode="loose"` added to ReactFlow component
- [x] Lint passes: `npm run lint`
- [x] Type check passes: `npm run check`
- [x] Build succeeds: `npm run build`
- [x] Manual test: Multiple connections on same node work correctly (dev server running at http://localhost:42069)

---

## Estimated Effort

- **Implementation:** 1 line of code
- **Verification:** 5-10 minutes (manual browser testing)

---

## Risk Assessment

| Risk                            | Impact | Likelihood | Mitigation |
| ------------------------------- | ------ | ---------- | ---------- |
| No significant risks identified | -      | -          | -          |

---

## Rollback Instructions

If issues arise, revert the change by removing `connectionMode="loose"` from the ReactFlow component.

```bash
# Revert command (if needed)
git checkout src/components/planner/PlannerCanvas.tsx
```

---

## References

- ReactFlow v12 Documentation: connectionMode prop
- Official ReactFlow Examples: `examples/src/connection-mode/App.tsx`
- `@xyflow/react` v12.10.0

---

## Work Execution

**To execute this plan:**

1. Apply the code change in `src/components/planner/PlannerCanvas.tsx`
2. Run verification: `npm run check`
3. Test in browser to confirm multiple connections work correctly

**Total tasks:** 1
**Status:** Ready
