# Work Plan: Fix Node Height Inconsistencies and Overlap

**Generated:** 2026-01-14
**Issue:** Nodes have inconsistent heights and sometimes overlap due to inaccurate height estimation in the auto-layout algorithm.

---

## Problem Analysis

### Current State

The current `dagre-layout.ts` uses a flawed height estimation:

```typescript
function estimateNodeHeight(node: Node): number {
  const baseHeight = 200
  const inputCount = data.customInputs?.length || 0
  const outputCount = data.customOutputs?.length || 0
  const badgeCount = inputCount + outputCount
  return baseHeight + badgeCount * 40
}
```

**Problems:**
1. Only counts CUSTOM inputs/outputs, ignoring recipe inputs/outputs
2. Recipe nodes can have 0-4+ inputs and 0-4+ outputs (each displayed as badges)
3. BuildingNode component renders ALL recipe inputs/outputs as badges
4. Variable content causes height variance of 50-150px between nodes
5. Dagre positions nodes assuming uniform height → overlaps occur

### Visual Impact

- Nodes with many inputs/outputs render taller than calculated
- Adjacent nodes in the same row overlap
- Edge routing becomes chaotic
- User experience degraded

---

## Layout Algorithm Explanation

### Current Algorithm: Dagre Hierarchical Layout

**What it does:**
1. Builds a directed graph from nodes and edges
2. Assigns each node a "rank" (vertical layer) based on dependencies
3. Orders nodes within each rank (horizontal position)
4. Uses fixed spacing: `nodesep` (node separation) and `ranksep` (rank separation)

**Critical: How Dagre positions nodes (CENTER-based)**

Dagre returns the **CENTER** (x, y) position of each node:

```
position: {
  x: nodeWithPosition.x - width / 2,
  y: nodeWithPosition.y - height / 2,
}
```

**The ranksep formula:**

```
center_to_center_distance = node_height + ranksep
```

This means:
- If node height = 200px and ranksep = 120px
- Center distance = 320px
- Gap between nodes = ranksep = 120px ✓

**If height is underestimated:**

```
Estimated: 200px, Actual: 280px, ranksep = 120px
Node A center: y = 140    (top=0, bottom=200 estimated)
Node B center: y = 260    (top=140, bottom=420)
                ↓
        Overlap: 200 - 140 = 60px ❌
```

The node we thought was 200px tall actually renders at 280px, overlapping into the next rank.

---

## Solution Strategy

### Phase 1: Fix Height Estimation (Accurate Calculation)

**New height formula based on BuildingNode rendering:**

```
base = 140px (card padding + header + recipe selector)
per_input_badge = 32px (badge height + gap)
per_output_badge = 32px (badge height + gap)
custom_handles = 0px (already accounted in handle positioning)

Height = 140 + (recipe_inputs * 32) + (recipe_outputs * 32) + (custom_inputs * 32) + (custom_outputs * 32)
```

### Phase 2: Fine-Tune Dagre Parameters

**Key insight:** `ranksep` is center-to-center distance minus node height

```
ranksep = center_to_center_distance - max_node_height
```

For our nodes (max ~344px height), we need:

- `ranksep = 360px` (≥ max height + 16px buffer for clean separation)
- `nodesep = 80px` (horizontal spacing between nodes in same rank)
- `align: 'UL'` (optional: left-align nodes within each rank)

**Why 360px?**
```
Node A (344px tall) center: y = 172
Node B center: y = 172 + 344 + 360 = 876
Gap between A bottom (344) and B top (676): 332px ✓
```

### Phase 3: Optional - Runtime Measurement

- Use ReactFlow's `useNodes` with `measured` dimensions
- Re-layout after initial render to get actual sizes
- Cache measurements for performance

---

## Implementation Tasks

### Task 1: Improve Height Estimation Function

- [ ] Update `estimateNodeHeight()` in `src/lib/dagre-layout.ts`
- [ ] Include recipe inputs/outputs in calculation
- [ ] Account for separator and badge layout
- [ ] Test with various recipe configurations

### Task 2: Fine-Tune Dagre Configuration

- [ ] Adjust `nodesep` from 60 to 80
- [ ] Adjust `ranksep` from 120 to **360** (≥ max node height + buffer)
- [ ] Consider adding `align: 'UL'` for left-aligned layout
- [ ] Test spacing with edge cases

### Task 3: Add Unit Tests for Height Calculation

- [ ] Create `src/lib/dagre-layout.test.ts`
- [ ] Test height calculation with various node configurations
- [ ] Verify no overlaps in test scenarios

### Task 4: Optional - Runtime Measurement Fallback

- [ ] Add `useLayout` hook for post-render measurement
- [ ] Implement automatic re-layout on dimension changes
- [ ] Add debouncing for performance

---

## Success Criteria

### Functional Requirements
1. [ ] All nodes render without vertical overlap
2. [ ] Height matches actual visual content within ±10px
3. [ ] Edges route cleanly between nodes
4. [ ] Layout remains stable (no jitter on re-render)

### Observable Behavior
- Nodes with 4 inputs + 4 outputs should have ~344px height
- Nodes with 1 input + 1 output should have ~204px height
- Adjacent ranks should have clear vertical separation

### Test Plan

**Test 1: Height Calculation Accuracy**
- Input: Node with 3 recipe inputs, 2 recipe outputs, 1 custom input
- Expected: Height = 140 + (3×32) + (2×32) + (1×32) = 140 + 192 = 332px
- Verify: Rendered height matches within ±10px

**Test 2: No Overlap with Maximal Nodes**
- Input: 5 nodes with varying input/output counts (0-4 each)
- Expected: No visual overlap between any nodes
- Verify: Manual inspection or screenshot comparison

**Test 3: Layout Stability**
- Input: Trigger layout 10 times consecutively
- Expected: Identical positions each time
- Verify: Console log positions, compare equality

---

## Files to Modify

1. `src/lib/dagre-layout.ts` - Main implementation
2. `src/lib/dagre-layout.test.ts` - New test file (optional)

---

## Estimated Effort

- **Task 1:** 1-2 hours (height estimation fix)
- **Task 2:** 30 min (parameter tuning - just change numbers)
- **Task 3:** 1-2 hours (tests and verification)
- **Task 4:** 3-4 hours (optional, if needed)

**Total:** 3-5 hours for core fix + tests
