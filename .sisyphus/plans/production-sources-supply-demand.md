# Work Plan: Production Sources & Supply/Demand Feature

## Overview

Add ability to define production sources (supply) and visualize supply vs demand for materials.

## User Stories

- As a user, I want to define my ore production by excavator count or rate
- As a user, I want to see how much of each resource is available vs consumed
- As a user, I want visual indicators for surplus (🟢) or deficit (🔴)
- As a user, I can switch between rate mode and building mode

---

## Data Structure

```typescript
// Production source definition
type ProductionMode = 'rate' | 'buildings'

interface ProductionSourceRate {
  mode: 'rate'
  itemId: string
  rate: number // e.g., 240/min
}

interface ProductionSourceBuildings {
  mode: 'buildings'
  itemId: string
  buildings: Array<{
    buildingId: string
    recipeId: string
    count: number // e.g., 2 excavators
  }>
}

type ProductionSource = ProductionSourceRate | ProductionSourceBuildings

// Demand from connected nodes
interface DemandInfo {
  itemId: string
  supply: number // from production sources
  demand: number // from connected consumers
  available: number // supply - demand (positive = surplus, negative = deficit)
}
```

---

## Files to Create

### 1. `src/components/planner/ProductionSources.tsx`

Main panel component for managing production sources.

### 2. `src/components/planner/ProductionSourceItem.tsx`

Individual production source row (editable).

### 3. `src/components/planner/SupplyDemandDisplay.tsx`

Shows supply vs demand for all tracked items.

---

## Files to Modify

### 1. `src/stores/planner-store.ts`

Add production sources state and actions.

### 2. `src/types/planner.ts`

Add type definitions for production sources.

### 3. `src/routes/planner.tsx`

Add ProductionSources panel to layout.

### 4. `src/components/planner/PlannerCanvas.tsx`

Calculate demand from nodes and pass to panel.

---

## Implementation Tasks

### Phase 1: Types & Store

- [ ] Add `ProductionSource` type definitions to `src/types/planner.ts`
- [ ] Add `productionSources` array to Zustand store
- [ ] Add `addProductionSource`, `updateProductionSource`, `removeProductionSource` actions
- [ ] Add `setProductionSourceMode` action for switching between rate/buildings

### Phase 2: Production Sources Panel

- [ ] Create `ProductionSources.tsx` component
- [ ] Add "Add Production Source" button (opens item selector)
- [ ] Render list of production sources
- [ ] Implement rate mode: simple number input
- [ ] Implement buildings mode: building + recipe selectors with count
- [ ] Add delete button for each source
- [ ] Calculate and display total supply per item

### Phase 3: Demand Calculation

- [ ] Create function to calculate demand for an item
  - Find all nodes that consume this item (as input)
  - Calculate required rate based on recipe × count
  - Sum all demands for that item
- [ ] Handle impure/pure variants (same base item compatibility)

### Phase 4: Supply vs Demand Display

- [ ] Create `SupplyDemandDisplay.tsx` component
- [ ] Show table of: Item | Supply | Demand | Available
- [ ] Color coding: 🟢 surplus (available > 0), 🔴 deficit (available < 0)
- [ ] Sort by deficit first (most needed first)

### Phase 5: Integration

- [ ] Add ProductionSources panel to planner route layout
- [ ] Connect store to panel
- [ ] Calculate demand reactively from nodes/edges
- [ ] Update display when connections change

---

## UI Design

### Production Sources Panel

```
┌─────────────────────────────────┐
│ Production Sources              │
├─────────────────────────────────┤
│ [+ Add Production Source]       │
│                                 │
│ Titanium Ore [Edit] [Delete]    │
│   Mode: Rate [Buildings]        │
│   Rate: 240 /min                 │
│                                 │
│ Calcium Ore [Edit] [Delete]     │
│   Mode: Buildings               │
│   2x Impure Calcium Ore         │
│   1x Calcium Ore                │
│   Total: 110 /min                │
│                                 │
└─────────────────────────────────┘
```

### Supply vs Demand Panel

```
┌─────────────────────────────────┐
│ Supply & Demand                 │
├─────────────────────────────────┤
│ Item          Supply  Demand  Avail│
│ Titanium Ore  240/min  120/min +120🟢│
│ Calcium Ore   110/min  150/min  -40🔴│
│ Wolfram Ore    60/min   60/min    0  │
│                                 │
└─────────────────────────────────┘
```

---

## Calculation Logic

### Demand Calculation

```typescript
function calculateDemand(
  itemId: string,
  nodes: PlannerNode[],
  recipes: Record<string, Recipe>,
): number {
  let totalDemand = 0

  nodes.forEach((node) => {
    const recipe = recipes[node.data.recipeId]
    const input = recipe.inputs.find((i) => i.itemId === itemId)
    if (input) {
      // Rate needed per building = (amount / time) * 60
      const ratePerBuilding = (input.amount / recipe.time) * 60
      totalDemand += ratePerBuilding * node.data.count
    }
  })

  return totalDemand
}
```

### Buildings Mode Calculation

```typescript
function calculateSupplyFromBuildings(
  sources: ProductionSourceBuildings[],
): Record<string, number> {
  const supply: Record<string, number> = {}

  sources.forEach((source) => {
    source.buildings.forEach((building) => {
      const recipe = recipes[building.recipeId]
      const output = recipe.outputs.find((o) => o.itemId === source.itemId)
      if (output) {
        const ratePerBuilding = (output.amount / recipe.time) * 60
        const total = ratePerBuilding * building.count
        supply[source.itemId] = (supply[source.itemId] || 0) + total
      }
    })
  })

  return supply
}
```

---

## Acceptance Criteria

- [ ] User can add production source for any item
- [ ] User can set production by rate (x/min)
- [ ] User can set production by building count (x buildings × recipe)
- [ ] User can switch between modes
- [ ] Total supply calculates correctly
- [ ] Demand calculates from connected consumers
- [ ] Supply vs Demand shows correctly (surplus/deficit)
- [ ] Color indicators work (🟢 for surplus, 🔴 for deficit)
- [ ] Data persists in localStorage

---

## Dependencies

- Uses existing `recipes` data from planner data
- Uses existing `nodes` and `edges` from planner store
- No new external dependencies

---

## Estimated Complexity

- Types & Store: Simple
- Production Sources Panel: Medium
- Demand Calculation: Simple
- Supply/Demand Display: Simple
- Integration: Simple

**Total**: ~4-5 hours
