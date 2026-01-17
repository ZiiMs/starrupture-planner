# Plan: Production Targets Feature

## Overview

Add ability to set production targets for items and visualize surplus/deficit across the factory.

## User Requirements

- Set target production rates for main ores/materials
- See current total production from all nodes
- Visual indicators for surplus (green) or deficit (red)
- Easy way to know "how much more I need" or "what I have too much of"

## UI Design

### Production Targets Panel

A sidebar or panel that shows:

```
Production Targets
├── Titanium Ore
│   ├── Target: 100/min
│   ├── Current: 75/min
│   └── Deficit: -25/min 🔴
│
├── Calcium Ore
│   ├── Target: 50/min
│   ├── Current: 80/min
│   └── Surplus: +30/min 🟢
```

### Visual Feedback on Nodes

- Color-coded badges showing if node contributes to meeting target
- Efficiency indicators update to show surplus/deficit

## Implementation Plan

### Phase 1: Data Store & State

1. Add `productionTargets` to Zustand store (itemId → targetRate)
2. Add actions: `setProductionTarget`, `removeProductionTarget`

### Phase 2: Production Targets Panel

1. Create `ProductionTargets.tsx` component
2. Show list of items with targets
3. Allow adding/editing/removing targets
4. Display current production vs target

### Phase 3: Calculate Current Production

1. Function to aggregate production from all nodes for an item
2. Consider: recipe outputs × node count
3. Show surplus/deficit calculation

### Phase 4: Visual Integration

1. Add efficiency warnings for production targets
2. Color-coded indicators (red=need more, green=surplus)
3. Update when nodes change

## Files to Create/Modify

### New Files

- `src/components/planner/ProductionTargets.tsx` - Main panel component
- `src/components/planner/ProductionTargetItem.tsx` - Individual target row

### Modified Files

- `src/stores/planner-store.ts` - Add production targets state
- `src/routes/planner.tsx` - Add ProductionTargets panel to layout
- `src/components/planner/PlannerCanvas.tsx` - Pass data to targets panel

## Data Structure

```typescript
interface ProductionTarget {
  itemId: string
  targetRate: number
}

interface ProductionStatus {
  targetRate: number
  currentRate: number
  surplus: number // positive = surplus, negative = deficit
  isMet: boolean // current >= target
}
```

## Component Structure

```
ProductionTargetsPanel
├── Header: "Production Targets"
├── AddTargetButton (opens dialog to select item)
└── TargetList
    └── ProductionTargetItem
        ├── Item display (icon + name)
        ├── Target input (editable)
        ├── Current production display
        └── Surplus/Deficit indicator
```

## Technical Details

### Calculation

```typescript
function calculateCurrentProduction(
  itemId: string,
  nodes: PlannerNode[],
  recipes: Record<string, Recipe>,
): number {
  return nodes.reduce((total, node) => {
    const recipe = recipes[node.data.recipeId]
    const output = recipe.outputs.find((o) => o.itemId === itemId)
    if (output) {
      const ratePerBuilding = (output.amount / recipe.time) * 60
      return total + ratePerBuilding * node.data.count
    }
    return total
  }, 0)
}
```

### Store Changes

```typescript
interface PlannerState extends HistoryState {
  // ... existing fields
  productionTargets: Record<string, number> // itemId → targetRate
  setProductionTarget: (itemId: string, rate: number) => void
  removeProductionTarget: (itemId: string) => void
}
```

## User Flow

1. User opens planner
2. Clicks "Add Production Target"
3. Selects item (e.g., "Titanium Ore")
4. Sets target rate (e.g., "100/min")
5. Panel shows current production vs target
6. User can see at a glance what needs more nodes

## Estimated Complexity

- **Production Targets Panel**: Medium
- **Current Production Calculation**: Simple
- **Visual Integration**: Simple

## Related Features

- Works with existing efficiency warnings
- Complements target rate on output nodes
- Could auto-suggest how many more nodes needed

## Open Questions

1. Should targets persist in localStorage? (Yes, like planner state)
2. Which items to show in dropdown? (All items or only those with recipes?)
3. How to handle impure/pure variants? (Treat same as recipe compatibility)
