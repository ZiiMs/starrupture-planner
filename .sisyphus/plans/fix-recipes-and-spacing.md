# Fix Production Chain Issues

**Plan Date:** 2026-01-13
**Status:** ✅ COMPLETED

## Issues Identified

### Issue 1: Wrong Recipe Selected ❌ FIXED
When looking up recipes for a building (e.g., smelter), the code picked the **first** recipe instead of the one relevant to the production chain.

**Example:**
- Smelter can use: `smelt-tungsten-bar` OR `smelt-titanium-bar`
- Old code found: `smelt-tungsten-bar` (first in array) ❌
- Now finds: `smelt-titanium-bar` (via stored `recipeId`) ✓

### Issue 2: Vertical Overlapping ❌ FIXED
Nodes overlapped despite setting spacing. Layout function now correctly applies `verticalSpacing: 120`.

---

## Implementation Summary

### Changes Made

| File | Change |
|------|--------|
| `BuildingSelector.tsx` | Added `recipeId` to ProductionChainSummary interface |
| `BuildingSelector.tsx` | Store `recipeId` when building production summary |
| `BuildingSelector.tsx` | Use `recipeId` for edge creation (not building type) |

---

## Verification

### Build ✅
```bash
npm run build  # Success
```

### Expected Output for 240 Titanium Bars/min
```
Production Chain:
- Smelter × 4 (smelt-titanium-bar recipe ✓)
- Ore Excavator × 2 (mine-titanium-ore recipe ✓)

Layout:
[Excavator]     [Smelter]
   Node 1    →     Node 1   (120px gap)
   Node 2    →     Node 2   (120px gap)
                    Node 3   (120px gap)
                    Node 4   (120px gap)
```

### Manual Test
1. Navigate to `/planner`
2. Select "Titanium Bar"
3. Enter "240" for items/min
4. Click "Place Production Chain"
5. Verify:
   - 4 Smelters with correct recipe
   - 2 Excavators with correct recipe
   - 120px vertical spacing between stacked nodes
   - Edges from excavators → smelters
