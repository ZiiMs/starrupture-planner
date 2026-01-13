# Fix Production Chain Edges and Spacing

**Plan Date:** 2026-01-13

## Context

### Current Problem
1. Edges are not connecting properly between excavators and smelters
2. Nodes are overlapping vertically (spacing too tight)

### Root Cause
The current `addProductionChain` function creates edges in the wrong direction and uses insufficient vertical spacing (default 80px).

### Desired Outcome
```
[Excavator 1] ─────┐
[Excavator 2] ─────┼──▶ [Smelter 1]
[Excavator 3] ─────┤      [Smelter 2]
                   │      [Smelter 3]
                   │      [Smelter 4]
                   └────▶ [Smelter 5]
```

- Each excavator connects to each smelter
- 120px vertical spacing between nodes
- Nodes organized by building type in columns

---

## Work Objectives

### Core Objective
Fix the production chain generation to:
1. Create edges from input buildings (excavators) to output buildings (smelters)
2. Increase vertical spacing to 120px between nodes
3. Ensure all connections are properly bidirectional

### Concrete Deliverables
- Updated `addProductionChain` function in BuildingSelector.tsx
- Edges connecting excavators → smelters correctly
- 120px vertical spacing between stacked nodes

### Definition of Done
- [ ] Excavators connect to smelters via edges
- [ ] 120px vertical spacing between stacked nodes
- [ ] Build succeeds
- [ ] Manual test shows correct layout

### Must Have
- Edges connect source (excavator) to target (smelter)
- Vertical spacing set to 120px
- All excavator nodes connect to all smelter nodes

### Must NOT Have
- Edges in wrong direction (smelter → excavator)
- Nodes overlapping vertically

---

## Implementation Plan

### Approach: Two-Pass Algorithm

**Pass 1:** Create all nodes and track IDs by building type
**Pass 2:** Create edges between building types based on recipe inputs

### Step 1: Replace addProductionChain function

Replace the current `addProductionChain` function with this corrected version:

```typescript
  const addProductionChain = () => {
    if (!selectedItemId || !itemsPerMinute || productionSummary.length === 0) return

    const targetRate = parseFloat(itemsPerMinute)
    if (isNaN(targetRate) || targetRate <= 0) return

    const nodesToAdd: Node[] = []
    const edgesToAdd: Edge[] = []

    // Pass 1: Create all nodes, track IDs by building type
    const nodeIdMap = new Map<string, string[]>()

    productionSummary.forEach((buildingInfo) => {
      const building = buildings[buildingInfo.buildingId]
      const recipe = Object.values(recipes).find((r) =>
        r.producers.includes(buildingInfo.buildingId),
      )

      if (!building || !recipe) return

      const nodeIds: string[] = []

      for (let i = 0; i < buildingInfo.count; i++) {
        const nodeId = nanoid()
        const outputRate = calculateOutputRate(recipe, building, 1)
        const powerConsumption = calculatePowerConsumption(building, 1)

        nodesToAdd.push({
          id: nodeId,
          type: 'planner-node',
          position: { x: 0, y: 0 },
          data: {
            buildingId: building.id,
            recipeId: recipe.id,
            count: 1,
            outputRate,
            powerConsumption,
          },
        })

        nodeIds.push(nodeId)
      }

      nodeIdMap.set(buildingInfo.buildingId, nodeIds)
    })

    // Pass 2: Create edges from input buildings to output buildings
    productionSummary.forEach((buildingInfo) => {
      const recipe = Object.values(recipes).find((r) =>
        r.producers.includes(buildingInfo.buildingId),
      )

      if (!recipe || recipe.inputs.length === 0) return

      const inputItemId = recipe.inputs[0].itemId

      // Find which building produces this input
      const inputBuildingSummary = productionSummary.find((bi) => {
        const biRecipe = Object.values(recipes).find((r) =>
          r.producers.includes(bi.buildingId),
        )
        return biRecipe?.outputs.some((o) => o.itemId === inputItemId)
      })

      if (!inputBuildingSummary) return

      const sourceNodeIds = nodeIdMap.get(inputBuildingSummary.buildingId) || []
      const targetNodeIds = nodeIdMap.get(buildingInfo.buildingId) || []

      // Connect each source to each target
      sourceNodeIds.forEach((sourceId) => {
        targetNodeIds.forEach((targetId) => {
          edgesToAdd.push({
            id: nanoid(),
            source: sourceId,
            target: targetId,
            type: 'efficiency-edge',
            animated: true,
            data: {
              itemId: inputItemId,
              amount: 1,
              usageRate: 0,
              producerRate: calculateOutputRate(
                Object.values(recipes).find((r) =>
                  r.producers.includes(inputBuildingSummary.buildingId),
                )!,
                buildings[inputBuildingSummary.buildingId],
                1,
              ),
              isWarning: false,
              sourceNodeId: sourceId,
              targetNodeId: targetId,
            },
          })
        })
      })
    })

    // Apply layout with 120px vertical spacing
    const { nodes: layoutedNodes } = layoutProductionChain(nodesToAdd, edgesToAdd, {
      direction: 'LR',
      nodeWidth: 172,
      nodeHeight: 80,
      columnSpacing: 250,
      verticalSpacing: 120,
    })

    if (layoutedNodes.length > 0) {
      addNodes(layoutedNodes)
      addEdges(edgesToAdd)
      setNodeCounter((c) => c + layoutedNodes.length)
      setSelectedItemId(null)
      setItemsPerMinute('60')
    }
  }
```

### Step 2: Verify changes
- Run `npm run build` to ensure no errors
- Test at `/planner` with Titanium Bar @ 240

---

## File Changes

| File | Change | Lines |
|------|--------|-------|
| `src/components/planner/BuildingSelector.tsx` | Replace addProductionChain function | ~90 lines |

---

## Verification

### Build Command
```bash
npm run build
```

### Manual Test
1. Navigate to `/planner`
2. Select "Titanium Bar"
3. Enter "240" for items/min
4. Click "Place Production Chain"
5. Verify:
   - 3 excavator nodes on left (stacked with 120px gaps)
   - 5 smelter nodes on right (stacked with 120px gaps)
   - Edges from each excavator to each smelter

---

## Commit Message
```
fix(planner): correct production chain edges and spacing

- Connect excavators → smelters (input → output)
- Increase vertical spacing to 120px
- Two-pass algorithm: nodes first, then edges
```
