# Work Plan: Fix Add Connector Buttons

## Bug Summary
**Issue**: "Add Input Connector" and "Add Output Connector" buttons in node context menu are non-functional (empty handlers)

## Root Cause
`PlannerCanvas.tsx:272-273` - Empty arrow functions:
```tsx
onAddInputConnector={() => {}}
onAddOutputConnector={() => {}}
```

## Scope
**IN SCOPE:**
- Fix empty handlers to add new input/output handles to nodes
- Add remove functionality for custom handles
- Clean up connected edges before removing handles
- Update context menu UI to show remove options

**OUT OF SCOPE:**
- Adding labels/names to custom connectors
- Item-type constraints on connectors
- Any other features not explicitly mentioned

## Technical Implementation

### 1. Node Data Structure (Already Exists)
```tsx
// In BuildingNode.tsx, data structure is:
data: {
  customInputs: Array<{ id: string }>,  // Lines 145-163
  customOutputs: Array<{ id: string }>, // Lines 180-199
}
```

### 2. Edge Data Structure (For Handle-Based Removal)
```tsx
// Edge has sourceHandle and targetHandle properties:
{
  source: string,
  target: string,
  sourceHandle?: string,  // Handle ID on source node
  targetHandle?: string,  // Handle ID on target node
  data?: { ... }
}
```

### 3. Handle ID Pattern for Custom Connectors
- Input handles: `{ id: 'custom-input-{timestamp}' }`
- Output handles: `{ id: 'custom-output-{timestamp}' }`

## Work Breakdown

### Task 1: Implement Add Input Connector Handler
**File**: `PlannerCanvas.tsx`
**Lines**: ~138-145 (near handleDeleteNode)

**Implementation**:
```tsx
const handleAddInputConnector = useCallback(() => {
  if (!menu?.id) return
  
  setNodes((nds) =>
    nds.map((node) => {
      if (node.id === menu.id) {
        const customInputs = [...((node.data as any).customInputs || []), { id: `custom-input-${Date.now()}` }]
        return { ...node, data: { ...node.data, customInputs } }
      }
      return node
    })
  )
  setMenu(null)
}, [menu?.id, setNodes])
```

  **Success Criteria**:
  - [x] Clicking "Add Input Connector" adds a new handle to the selected node
  - [x] New handle appears on left side of node with secondary styling
  - [x] Handle can be connected to other nodes via drag
  - [x] No console errors
  - [x] Node re-renders correctly

### Task 2: Implement Add Output Connector Handler
**File**: `PlannerCanvas.tsx`
**Lines**: ~138-145 (near handleAddInputConnector)

**Implementation**:
```tsx
const handleAddOutputConnector = useCallback(() => {
  if (!menu?.id) return
  
  setNodes((nds) =>
    nds.map((node) => {
      if (node.id === menu.id) {
        const customOutputs = [...((node.data as any).customOutputs || []), { id: `custom-output-${Date.now()}` }]
        return { ...node, data: { ...node.data, customOutputs } }
      }
      return node
    })
  )
  setMenu(null)
}, [menu?.id, setNodes])
```

  **Success Criteria**:
  - [x] Clicking "Add Output Connector" adds a new handle to the selected node
  - [x] New handle appears on right side of node with secondary styling
  - [x] Handle can be connected to other nodes via drag
  - [x] No console errors
  - [x] Node re-renders correctly

### Task 3: Wire Up Add Handlers in JSX
**File**: `PlannerCanvas.tsx`
**Lines**: 264-275

**Change**:
```tsx
// Before:
onAddInputConnector={() => {}}
onAddOutputConnector={() => {}}

// After:
onAddInputConnector={handleAddInputConnector}
onAddOutputConnector={handleAddOutputConnector}
```

  **Success Criteria**:
  - [x] Context menu buttons now trigger the handler functions
  - [x] Menu closes after adding connector
  - [x] No console errors

### Task 4: Update Context Menu UI for Remove Options
**File**: `NodeContextMenu.tsx`
**Lines**: Full component

**Change**: Add remove buttons to menu component:
- Add `onRemoveInputConnector` and `onRemoveOutputConnector` props
- Add UI buttons similar to Add buttons but with minus/trash icon
- Only show when custom connectors exist (optional, but safer)

  **Success Criteria**:
  - [x] Remove buttons appear in context menu
  - [x] Buttons have appropriate icons
  - [x] Buttons are styled consistently with Add buttons

### Task 5: Implement Remove Input Connector Handler
**File**: `PlannerCanvas.tsx`
**Lines**: New function (after handleAddOutputConnector)

**Implementation**:
```tsx
const handleRemoveInputConnector = useCallback((connectorId: string) => {
  if (!menu?.id) return
  
  // First, remove any edges connected to this handle
  setEdges((eds) =>
    eds.filter((edge) => {
      // Keep edge if it's NOT connected to the target handle
      return !(edge.target === menu.id && edge.targetHandle === connectorId)
    })
  )
  
  // Then, remove the handle from customInputs
  setNodes((nds) =>
    nds.map((node) => {
      if (node.id === menu.id) {
        const customInputs = ((node.data as any).customInputs || []).filter(
          (input: any) => input.id !== connectorId
        )
        return { ...node, data: { ...node.data, customInputs } }
      }
      return node
    })
  )
  setMenu(null)
}, [menu?.id, setNodes, setEdges])
```

**Key Considerations**:
- Only check `targetHandle` for input connectors (connections flow into input handles)
- Remove edges BEFORE removing handle to prevent dangling connections

  **Success Criteria**:
  - [x] Clicking remove button removes the connector handle
  - [x] Any edges connected to that handle are also removed
  - [x] No dangling edges in the graph
  - [x] Node re-renders correctly

### Task 6: Implement Remove Output Connector Handler
**File**: `PlannerCanvas.tsx`
**Lines**: New function (after handleRemoveInputConnector)

**Implementation**:
```tsx
const handleRemoveOutputConnector = useCallback((connectorId: string) => {
  if (!menu?.id) return
  
  // First, remove any edges connected to this handle
  setEdges((eds) =>
    eds.filter((edge) => {
      // Keep edge if it's NOT connected to the source handle
      return !(edge.source === menu.id && edge.sourceHandle === connectorId)
    })
  )
  
  // Then, remove the handle from customOutputs
  setNodes((nds) =>
    nds.map((node) => {
      if (node.id === menu.id) {
        const customOutputs = ((node.data as any).customOutputs || []).filter(
          (output: any) => output.id !== connectorId
        )
        return { ...node, data: { ...node.data, customOutputs } }
      }
      return node
    })
  )
  setMenu(null)
}, [menu?.id, setNodes, setEdges])
```

**Key Considerations**:
- Only check `sourceHandle` for output connectors (connections flow out of output handles)

**Success Criteria**:
- [x] Clicking remove button removes the connector handle
- [x] Any edges connected to that handle are also removed
- [x] No dangling edges in the graph
- [x] Node re-renders correctly

### Task 7: Wire Up Remove Handlers in JSX
**File**: `PlannerCanvas.tsx`
**Lines**: 264-275

**Change**:
```tsx
<NodeContextMenu
  onClick={onPaneClick}
  top={menu.top!}
  left={menu.left!}
  right={menu.right}
  bottom={menu.bottom}
  onDeleteNode={handleDeleteNode}
  onAddInputConnector={handleAddInputConnector}
  onAddOutputConnector={handleAddOutputConnector}
  onRemoveInputConnector={handleRemoveInputConnector}
  onRemoveOutputConnector={handleRemoveOutputConnector}
/>
```

### Task 8: Update NodeContextMenu Prop Types
**File**: `NodeContextMenu.tsx`
**Lines**: 8-17

**Change**:
```tsx
interface NodeContextMenuProps {
  top?: number
  left?: number
  right?: number
  bottom?: number
  onClick: () => void
  onDeleteNode: () => void
  onAddInputConnector: () => void
  onAddOutputConnector: () => void
  onRemoveInputConnector: (connectorId: string) => void  // NEW
  onRemoveOutputConnector: (connectorId: string) => void // NEW
}
```

### Task 9: Update NodeContextMenu UI
**File**: `NodeContextMenu.tsx`
**Lines**: 33-76

**Change**: Add remove buttons in the menu:
- Place after add buttons (or in a submenu if too many)
- Each remove button needs to pass the connector ID
- Handle case when no custom connectors exist (optional: disable/hide)

**UI Options**:
1. Simple list - Add/Remove buttons next to each other
2. Submenu - "Add Input" > shows list, "Add Output" > shows list
3. Conditional - Only show Remove if custom connectors exist

**Recommendation**: Keep it simple - add "Remove Input Connector" and "Remove Output Connector" buttons. When clicked, show a submenu or modal with list of connectors to remove.

**Simpler Alternative**: Make the remove buttons show a list directly:
```tsx
<div className="relative group">
  <button className="...">
    <Minus className="h-4 w-4" />
    Remove Input Connector
  </button>
  {/* Show dropdown on hover/click */}
  <div className="hidden group-hover:block ...">
    {customInputs.map(input => (
      <button onClick={() => onRemoveInputConnector(input.id)}>
        {input.id}
      </button>
    ))}
  </div>
</div>
```

### Task 10: Testing and Verification
**Manual Testing Checklist**:
- [x] Add input connector to node, verify handle appears
- [x] Add output connector to node, verify handle appears
- [x] Connect new handle to another node
- [x] Remove connector with connection, verify edge is removed
- [x] Remove connector without connection, verify no errors
- [x] Multiple add/remove operations work correctly
- [x] Node styling remains consistent
- [x] No console errors
- [x] LocalStorage still works correctly

## Files to Modify

1. **`src/components/planner/PlannerCanvas.tsx`**
   - Add 4 new handler functions
   - Wire up handlers in JSX
   - Update prop passing to NodeContextMenu

2. **`src/components/planner/NodeContextMenu.tsx`**
   - Update interface with remove handlers
   - Add UI for remove functionality

## Estimated Complexity
- **Low Complexity**: Tasks 1-3 (add handlers, wire up)
- **Medium Complexity**: Tasks 4-9 (remove handlers, UI updates)
- **Testing**: Task 10 (manual verification)

## Potential Issues and Mitigations

| Issue | Mitigation |
|-------|-----------|
| Handle ID conflicts | Use `Date.now()` + random suffix |
| Edge removal misses connections | Test edge removal with multiple connections |
| ReactFlow not re-rendering | Use functional setNodes/setEdges updates |
| Performance with many handles | Custom connectors likely rare, no optimization needed |
| Removing recipe-based handles | Only remove custom inputs/outputs, never recipe-based |

## Success Definition
**MVP Outcome**: Users can right-click a node, select "Add Input Connector" or "Add Output Connector" to add new connection handles. Users can also remove custom connectors via context menu, with any connected edges automatically cleaned up.

**Metrics**:
- [x] Add input button adds handle (verified visually)
- [x] Add output button adds handle (verified visually)
- [x] New handles can receive connections
- [x] Remove button removes handle (verified visually)
- [x] Connected edges are removed when handle is removed
- [x] No console errors
- [x] No crashes
