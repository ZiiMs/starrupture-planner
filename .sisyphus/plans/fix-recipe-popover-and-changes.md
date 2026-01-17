# Plan: Fix Recipe Popover and Recipe Change Issues

## Issues Identified

### Issue 1: Popover Trigger Not Showing Recipe List

**Root Cause**: In `src/components/planner/BuildingNode.tsx` line 394:

```tsx
<PopoverContent className=" p-0">
```

There's a leading space in the className which causes the CSS class `p-0` to not be applied correctly. The PopoverContent renders but without proper styling/visibility.

**Fix Required**:

- Remove the leading space from `className=" p-0"` → `className="p-0"`

### Issue 2: Recipe Change Not Working Properly

**Root Causes**:

1. **Wrong callback arguments**: In `src/components/planner/BuildingNode.tsx` line 412:

   ```tsx
   onRecipeChange?.(r.id, currentValue)
   ```

   Should be: `onRecipeChange?.(id, r.id)` - arguments are swapped!

2. **Incorrect state comparison**: Line 408 compares `currentValue === currentRecipe` where `currentRecipe` is a state variable, not the actual recipe ID from props. This should compare to the actual recipe ID from node data.

3. **Missing disconnection logic**: The `handleRecipeChange` function in `src/components/planner/PlannerCanvas.tsx` (lines 303-329) doesn't:
   - Disconnect edges when recipe outputs change to incompatible items
   - Recalculate node count when switching between recipes with different outputs
   - Handle edge case: switching from "Normal Ore" to "Impure Ore" (same item type, different amounts)

## Files to Modify

### 1. `src/components/planner/BuildingNode.tsx`

**Lines 394**: Fix PopoverContent className
**Lines 407-412**: Fix onSelect handler logic and callback arguments

### 2. `src/components/planner/PlannerCanvas.tsx`

**Lines 303-329**: Enhance handleRecipeChange function to:

- Get current edges before updating node
- Identify edges that need disconnection (when output item changes)
- Remove incompatible edges
- Recalculate count if output item or rate changes
- Maintain connections when only output rate changes (e.g., Normal → Impure)

## Implementation Details

### Step 1: Fix Popover ClassName (BuildingNode.tsx)

```typescript
// Line 394: Change from:
<PopoverContent className=" p-0">
// To:
<PopoverContent className="p-0">
```

### Step 2: Fix Recipe Selection Handler (BuildingNode.tsx)

```typescript
// Lines 407-412: Change from:
onSelect={(currentValue) => {
  setCurrentRecipe(
    currentValue === currentRecipe ? '' : currentValue,
  )
  setOpenRecipes(false)
  onRecipeChange?.(r.id, currentValue)
}}

// To:
onSelect={(currentValue) => {
  setCurrentRecipe(currentValue)
  setOpenRecipes(false)
  onRecipeChange?.(id, r.id)
}}
```

### Step 3: Enhance handleRecipeChange (PlannerCanvas.tsx)

The function needs to:

1. Get current edges before updating
2. Identify edges to disconnect when output item changes
3. Remove incompatible edges
4. Recalculate count if needed
5. Maintain compatible connections

**Logic**:

- Get old recipe from current node data
- Get new recipe from plannerData
- If old recipe outputs ≠ new recipe outputs:
  - Find all edges where this node is the source
  - Check if edge's itemId matches any old recipe output
  - Check if any connected node can accept the new recipe output
  - Disconnect edges where target node doesn't need the new output item
- If outputs are compatible (same itemId, different amounts):
  - Keep connections
  - Recalculate count for connected nodes

**Pseudo-code**:

```typescript
const handleRecipeChange = useCallback(
  (nodeId: string, newRecipeId: string) => {
    pushToHistory()

    const currentNode = nodes.find((n) => n.id === nodeId)
    if (!currentNode || !plannerData) return

    const oldRecipe = plannerData.recipes[currentNode.data.recipeId]
    const newRecipe = plannerData.recipes[newRecipeId]
    if (!oldRecipe || !newRecipe) return

    // Check if outputs are compatible (same item, different amount)
    const oldOutputItem = oldRecipe.outputs[0]?.itemId
    const newOutputItem = newRecipe.outputs[0]?.itemId

    if (oldOutputItem !== newOutputItem) {
      // Outputs changed - need to disconnect incompatible edges
      const currentEdges = usePlannerStore.getState().present.edges
      const edgesToRemove: string[] = []

      currentEdges.forEach((edge) => {
        if (edge.source === nodeId) {
          // This edge comes from our node
          const targetNode = nodes.find((n) => n.id === edge.target)
          if (targetNode) {
            const targetRecipe = plannerData.recipes[targetNode.data.recipeId]
            const targetAcceptsItem = targetRecipe.inputs.some(
              (input) => input.itemId === newOutputItem,
            )
            if (!targetAcceptsItem) {
              edgesToRemove.push(edge.id)
            }
          }
        }
      })

      // Remove incompatible edges
      edgesToRemove.forEach((edgeId) => removeEdge(edgeId))
    }

    // Update node with new recipe
    const buildingData = plannerData.buildings[currentNode.data.buildingId]
    updateNode(nodeId, {
      recipeId: newRecipeId,
      outputRate: calculateOutputRate(
        newRecipe,
        buildingData,
        currentNode.data.count || 1,
      ),
    })

    // Re-layout to account for height changes
    runAutoLayout()
  },
  [plannerData, nodes, pushToHistory, updateNode, runAutoLayout],
)
```

## Testing Scenarios

### Popover Test

- [ ] Click trigger button → Popover opens
- [ ] Recipe list displays all available recipes
- [ ] Can search/filter recipes
- [ ] Can select a recipe from the list

### Recipe Change Tests

- [ ] Change recipe to different output item → Connections disconnect
- [ ] Change recipe to same output item, different rate → Connections stay, count recalculates
- [ ] Example: Ore Excavator (Calcium Ore) → Smelter
  - Change to Impure Calcium Ore → Stays connected, recalculates
  - Change to Titanium Ore → Disconnects from Smelter

## Dependencies & Constraints

- No new dependencies required
- Follow existing code patterns in both files
- Maintain undo/redo functionality (pushToHistory is already called)
- Keep auto-layout trigger after changes

## Estimated Complexity

- **Popover fix**: Simple (1 line change + 1 line fix)
- **Recipe change fix**: Medium (1 line fix in BuildingNode + ~40 lines in PlannerCanvas)

## Related Files

- `src/components/planner/BuildingNode.tsx` - Recipe selection UI
- `src/components/planner/PlannerCanvas.tsx` - Recipe change logic
- `src/types/planner.ts` - Type definitions (no changes needed)
- `src/stores/planner-store.ts` - Zustand store (no changes needed)
