# Add Elements Redesign - Learnings

**Session:** ses_44a09afc9ffe9pQIUxAmNDIcd4
**Date:** 2026-01-13

## Implementation Summary

Redesigned the Add Elements UI from a fixed sidebar to a floating overlay with searchable dropdowns and rate-based production chain generation.

## Key Decisions Made

### 1. Overlay Structure
- Used fixed positioning with z-index layers (z-40 for backdrop, z-50 for card)
- Backdrop covers entire screen and closes on click
- Card positioned at `fixed right-4 top-4` with max-height and overflow

### 2. Searchable Selector Pattern
- Created reusable `ElementSelector.tsx` component
- Used memoization with `useMemo` for filtering performance
- Grouped results by category with icons
- Clear search button for quick reset

### 3. Rate Input Workflow
- Two-state approach: search first → expand for rate
- Default rate of 60 items/min
- Production summary shows building breakdown before adding
- Uses `calculateBuildingsNeeded()` with `Math.ceil()` for whole buildings

### 4. Production Chain Calculation
- Recursive function traverses recipe tree
- Passes `targetOutput` to calculate exact building counts per level
- `nodeCountMap` tracks building counts per node for edge calculations
- Input rates calculated: `(input.amount / recipe.time) * 60 * buildingsNeeded`

## Patterns Discovered

### React + ReactFlow Integration
- ReactFlow's `useNodesState`/`useEdgesState` for local state
- `useReactFlow` hook provides `addNodes`/`addEdges` for modifications
- Background component can be conditionally rendered

### TypeScript Patterns
- `useMemo` for expensive filtered computations
- Interface composition for component props
- Type guards when accessing nested object properties

## Technical Gotchas

### 1. Import Ordering
- `useMemo` import appeared twice (at top and end of file)
- Fixed by moving to single import at top

### 2. Node Count Tracking
- Original code tried `nodeRecipeMap.get(parentNodeId)?.data.count`
- Recipe type doesn't have `.data.count` property
- Solution: Separate `nodeCountMap` to track counts per node ID

### 3. Pre-existing Build Errors
- `resizable.tsx` has TS errors (unrelated to changes)
- Build command fails on clean checkout (not introduced by this work)

## Files Modified

| File | Lines | Purpose |
|------|-------|---------|
| `src/components/planner/BuildingSelector.tsx` | 376 | Main overlay with rate input logic |
| `src/components/planner/PlannerCanvas.tsx` | 441 | Toggle button, keyboard shortcuts |
| `src/components/planner/ElementSelector.tsx` | 128 | New searchable dropdown component |

## Keyboard Shortcuts Added

| Key | Action |
|-----|--------|
| `/` | Open element selector |
| `Escape` | Close selector or context menu |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+S` | Save to localStorage |

## Production Chain Example

**Titanium Bar @ 240/min:**
```
Level 0: Smelter ×4 (60 bars/min each)
  ↓ 240 ore/min
Level 1: Ore Excavator ×2 (120 ore/min each)
```

## Future Improvements

- Focus search input automatically when selector opens
- Animate open/close transitions
- Add B/I shortcuts to switch tabs directly
- Save recent searches for quick access
