# Draft: Fix Add Connector Buttons

## Bug Report

**Issue**: Add Input Connector and Add Output Connector buttons in context menu don't work when clicked

## Root Cause

In `PlannerCanvas.tsx:272-273`, the handlers are empty arrow functions:

```tsx
onAddInputConnector={() => {}}
onAddOutputConnector={() => {}}
```

## Requirements

### Confirmed by User

1. **Add Connector Buttons**:
   - Fix empty handlers so clicking "Add Input Connector" adds a new input handle
   - Fix empty handlers so clicking "Add Output Connector" adds a new output handle
   - Use existing `data.customInputs` and `data.customOutputs` arrays
   - Generate unique IDs for new connectors

2. **Remove Connector Functionality**:
   - Users must be able to remove custom connectors they've added
   - **Safety requirement**: Must remove any edges connected to the connector BEFORE deleting the handle
   - Prevent dangling connections

3. **Connector Nature**:
   - Custom connectors are generic input/output points
   - No labels or item-type constraints
   - Differentiated visually from recipe-based connectors (already implemented: `bg-secondary!` styling)

## Technical Details from Codebase

### Existing Infrastructure

**Node Data Structure**:

- `data.customInputs`: Array of custom input connectors
- `data.customOutputs`: Array of custom output connectors
- Each connector has an `id` field

**Handle Rendering** (`BuildingNode.tsx`):

- Lines 145-163: Custom input handles rendering
- Lines 180-199: Custom output handles rendering
- Dynamic positioning based on total connector count
- Secondary styling (`bg-secondary! border-secondary-foreground!`)

**Node Update Pattern**:

- `setNodes((nds) => nds.map(node => ...))` for updating node data
- `setEdges((eds) => eds.filter(...))` for removing edges
- Both hooks available in `PlannerCanvas.tsx`

## Open Questions

**How should users trigger "remove connector"?**

- Right-click on the handle itself?
- Add a "Remove Connector" submenu item in the context menu?
- Other approach?
