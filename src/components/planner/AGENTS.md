# src/components/planner - ReactFlow Planner Components

**Generated:** 2026-01-12

## OVERVIEW

ReactFlow-based planner canvas with custom nodes, edges, and state management via Zustand. Handles building placement, connections, and calculations.

## STRUCTURE

```
src/components/planner/
├── PlannerCanvas.tsx     # Main ReactFlow canvas, node/edge initialization
├── BuildingNode.tsx      # Custom node component for buildings (memoized)
├── BuildingSelector.tsx  # Sidebar for selecting buildings to place
├── Controls.tsx          # Canvas controls (zoom, fit, reset)
├── Minimap.tsx          # ReactFlow minimap
└── NodeContextMenu.tsx  # Context menu for node actions
```

## WHERE TO LOOK

| Task            | Component                   | Notes                                 |
| --------------- | --------------------------- | ------------------------------------- |
| Canvas setup    | PlannerCanvas.tsx           | ReactFlow config, node types, edges   |
| Custom nodes    | BuildingNode.tsx            | Memoized, use NodeProps               |
| Building UI     | BuildingSelector.tsx        | Search, filter, drag-and-drop         |
| User actions    | NodeContextMenu.tsx         | Delete, connect actions               |
| Canvas controls | Controls.tsx                | Zoom, fit view, reset                 |
| State           | src/stores/planner-store.ts | Zustand store for selections, history |

## CONVENTIONS

- **Custom nodes**: Use `memo()` to prevent unnecessary re-renders
- **Node types**: Register with `nodeTypes` in `addEdge` + `useNodesState` pattern
- **State**: All planner state in Zustand store, not component state
- **Data**: Fetch via `usePlannerData()` hook (TanStack Query)
- **Styling**: Custom CSS for ReactFlow handles, edges, and labels
- **Edges**: Auto-generate on connection with `getEdgeParams()` helper
- **Interactions**: Use `onNodesChange`, `onEdgesChange` handlers
- **Selection**: Track selected nodes in Zustand, use `getIntersectingNodes()`

## ANTI-PATTERNS

- Don't store ReactFlow nodes/edges in component state - use Zustand
- Don't use `useEffect` for node updates - use Zustand actions
- Don't memoize entire node components - only expensive parts
- Don't use inline functions for node data - create stable references
- Don't use `asChild` for node actions - use ReactFlow's `onNodeClick` patterns
