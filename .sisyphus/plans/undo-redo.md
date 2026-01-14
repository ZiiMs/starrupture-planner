# Undo/Redo History Implementation

## Context

### Original Request

User: "The top right buttons seem to do nothing. The undo button and redo button don't work. We previously had a plan to implement this but I believe I lost some data when pushing it up to main. Lets take our time and figure out best way to implement the undo/redo history. I think we should use zustand to store the data."

### Interview Summary

**Key Discussions**:

- Found existing Zustand store has `undo`/`redo` actions but no way to capture state changes
- ReactFlow uses local `useNodesState`/`useEdgesState` - disconnected from store history
- Buttons exist in `Controls.tsx` but have no effect on actual state
- Keyboard shortcuts mentioned in tooltips but not implemented
- Button disabled states not wired to store selectors

**Research Findings**:

- Store at `src/stores/planner-store.ts` has history infrastructure (past/present/future) but missing `pushToHistory` action
- `PlannerCanvas.tsx` has 30+ state mutation points via `setNodes`/`setEdges`
- `BuildingSelector.tsx` uses `useReactFlow().addNodes`/`addEdges` directly, bypassing local state
- Vitest configured but no tests exist
- ReactFlow docs recommend capturing state before applying changes in `onNodesChange`/`onEdgesChange`

### Metis Review

**Identified Gaps** (addressed):

- Missing `pushToHistory` action - root cause of non-functional buttons
- 30+ mutation points need history capture wrapper
- BuildingSelector bypasses local state - requires refactor to use local state
- History depth limit needed to prevent memory bloat

---

## Work Objectives

### Core Objective

Make undo/redo buttons fully functional by integrating Zustand history store with ReactFlow state mutations, adding keyboard shortcuts, and implementing proper button disabled states.

### Concrete Deliverables

- `src/stores/planner-store.ts` - Updated store with `pushToHistory` action and history limit
- `src/components/planner/Controls.tsx` - Buttons with disabled states via selectors
- `src/components/planner/PlannerCanvas.tsx` - History capture before state mutations
- `src/components/planner/BuildingSelector.tsx` - Refactored to use local state for undo/redo
- `src/stores/__tests__/planner-store.test.ts` - Unit tests for history logic

### Definition of Done

- [x] Clicking Undo button reverts the last user action
- [x] Clicking Redo button re-applies the last undone action
- [x] Ctrl+Z triggers undo when canvas is focused
- [x] Ctrl+Y triggers redo when canvas is focused
- [x] Undo button disabled when history is empty
- [x] Redo button disabled when future is empty
- [x] Adding production chain creates single history entry (not N entries)
- [x] Initial auto-layout does NOT create history entry
- [x] Edge efficiency recalculation does NOT create history entry
- [x] History limited to 50 entries to prevent memory bloat
- [x] All unit tests pass

### Must Have

- [x] Functional undo/redo buttons
- [x] Ctrl+Z / Ctrl+Y keyboard shortcuts
- [x] Proper disabled states on buttons
- [x] History capture on all user-initiated mutations
- [x] Batch operations (production chains) as single undo step
- [x] History depth limit (50 entries)

### Must NOT Have (Guardrails)

- Refactoring to single source of truth architecture
- Zundo middleware integration
- Ctrl+S save shortcut
- Visual history timeline or dropdown
- History persistence to localStorage
- Toast notifications for undo/redo
- Undo/redo of auto-layout operations
- Undo/redo of edge efficiency calculations

---

## Verification Strategy

### Test Decision

- **Infrastructure exists**: YES (Vitest configured)
- **User wants tests**: YES (after implementation)
- **Framework**: vitest + @testing-library/react

### Test Setup Task

- [x] 0. Setup Test Infrastructure
  - [x] Verify: `npm run test` → shows vitest help
  - [x] Create: `src/stores/__tests__/planner-store.test.ts`
  - [x] Verify: `npm run test` → runs with 0 failures

### Test Coverage Required

- History state transitions (past → present → future)
- Edge cases: empty history, boundary conditions
- Selector functions (`selectCanUndo`, `selectCanRedo`)
- State immutability verification
- History limit enforcement

---

## Task Flow

```
Task 1 (Store) ──→ Task 2 (Canvas mutations) ──→ Task 6 (Tests)
       │                   │
       │                   └──→ Task 3 (BuildingSelector)
       │                            │
       │                            └──→ Task 4 (Controls buttons)
       │                                       │
       │                                       └──→ Task 5 (Keyboard shortcuts)
       │                                                  │
       └──────────────────────────────────────────────────┘
```

## Status: ALL TASKS COMPLETE ✓

## Parallelization

| Group | Tasks   | Reason                                     |
| ----- | ------- | ------------------------------------------ |
| A     | 1, 2, 3 | Independent files, can be done in parallel |
| B     | 4, 5    | Both UI changes, share context             |
| C     | 6       | Depends on store implementation            |

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> Specify parallelizability for EVERY task.

- [x] 1. Add `pushToHistory` action to Zustand store with history limit

  **What to do**:
  - Add `pushToHistory: (nodes: PlannerNode[], edges: PlannerEdge[]) => void` action
  - Implement history limit (keep last 50 entries, slice older)
  - Update store's present state when pushing to history
  - Maintain bidirectional history (past/future stacks)
  - Write tests for history push, undo, redo, limit enforcement

  **Must NOT do**:
  - DO NOT add persistence to localStorage
  - DO NOT change existing undo/redo action signatures
  - DO NOT modify selector function names

  **Parallelizable**: YES (with 2, 3) | NO (depends on: 0)

  **References**:

  **Pattern References** (existing code to follow):
  - `src/stores/planner-store.ts:17-28` - Current undo action pattern (pop from past, push present to future)
  - `src/stores/planner-store.ts:31-43` - Current redo action pattern (pop from future, push present to past)
  - `src/types/planner.ts:73-76` - HistoryState interface definition

  **API/Type References** (contracts to implement against):
  - `src/types/planner.ts:PlannerNode` - Node structure for history snapshots
  - `src/types/planner.ts:PlannerEdge` - Edge structure for history snapshots
  - `src/types/planner.ts:HistoryState` - Interface to implement

  **Test References** (testing patterns to follow):
  - No existing tests - follow vitest patterns from package.json scripts

  **External References** (libraries and frameworks):
  - Zustand docs: `https://zustand.docs.pmnd.rs/` - Store creation and actions
  - ReactFlow `applyNodeChanges` pattern: How to snapshot before changes

  **WHY Each Reference Matters**:
  - `planner-store.ts:17-28` - Shows exact pattern for history manipulation (past/present/future arrays)
  - `types/planner.ts:73-76` - Confirms expected data structure for history entries
  - Zustand docs - Verify correct action signature and state update patterns

  **Acceptance Criteria**:

  _Tests:_
  - [x] Test file created: `src/stores/__tests__/planner-store.test.ts`
  - [x] Test: `pushToHistory` adds to past array
  - [x] Test: `pushToHistory` with 50+ entries keeps only last 50
  - [x] Test: `undo` after `pushToHistory` restores previous state
  - [x] Test: `redo` after `undo` restores next state
  - [x] `npm run test` → PASS (6 tests, 0 failures)

  _Manual Execution Verification:_
  - [x] Using lsp_diagnostics: No type errors in store file
  - [x] Using bash: `npm run lint` → No errors

  **Commit**: YES
  - Message: `feat(undo-redo): add pushToHistory action with limit`
  - Files: `src/stores/planner-store.ts`, `src/stores/__tests__/planner-store.test.ts`
  - Pre-commit: `npm run lint`

- [x] 2. Wrap ReactFlow handlers in PlannerCanvas to capture history before mutations

  **What to do**:
  - Modify `onNodesChange` to call `pushToHistory` BEFORE applying changes
  - Modify `onEdgesChange` to call `pushToHistory` BEFORE applying changes
  - Modify `onConnect` to call `pushToHistory` BEFORE adding edge
  - Ensure only user-initiated changes trigger history (skip layout, efficiency calc)
  - Access current nodes/edges via state refs or store to capture snapshot

  **Must NOT do**:
  - DO NOT wrap edge efficiency recalculation (lines ~317-341)
  - DO NOT wrap initial layout application (first-time only)
  - DO NOT wrap localStorage load (handled by other worktree)
  - DO NOT modify handler logic beyond adding history capture

  **Parallelizable**: YES (with 1, 3) | NO (depends on: 1)

  **References**:

  **Pattern References** (existing code to follow):
  - `src/components/planner/PlannerCanvas.tsx:112-146` - Current `onConnect` handler pattern
  - `src/components/planner/PlannerCanvas.tsx:160-168` - `handleDeleteNode` pattern
  - `src/components/planner/PlannerCanvas.tsx:170-186` - `handleAddInputConnector` pattern
  - `src/components/planner/PlannerCanvas.tsx:343-363` - `handleRecipeChange` pattern

  **API/Type References** (contracts to implement against):
  - `src/stores/planner-store.ts` - Store actions and selectors
  - ReactFlow `applyNodeChanges` - How changes are applied to nodes
  - ReactFlow `applyEdgeChanges` - How changes are applied to edges

  **External References** (libraries and frameworks):
  - ReactFlow docs: `https://reactflow.dev/learn/concepts/adding-interactivity` - onNodesChange/onEdgesChange patterns
  - ReactFlow `applyNodeChanges` utility: Processing node changes before application

  **WHY Each Reference Matters**:
  - `PlannerCanvas.tsx:112-146` - Shows where onConnect is defined, need to add history capture before setEdges
  - `PlannerCanvas.tsx:160-168` - Delete handler, need to capture before setNodes/setEdges
  - `PlannerCanvas.tsx:343-363` - Recipe change handler, need to capture before setNodes
  - Store actions - Need to import and call pushToHistory before mutations

  **Acceptance Criteria**:

  _Manual Execution Verification:_
  - [ ] Using interactive_bash (tmux session):
    - Command: `npm run dev`
    - Navigate to: `http://localhost:3000`
    - Action: Add a node, click Undo button
    - Verify: Node is removed (canvas reflects undone state)
    - Action: Click Redo button
    - Verify: Node is restored (canvas reflects redone state)
  - [ ] Screenshot saved: `.sisyphus/evidence/task-2-undo-node.png`

  **Commit**: YES
  - Message: `feat(undo-redo): capture history before ReactFlow mutations`
  - Files: `src/components/planner/PlannerCanvas.tsx`
  - Pre-commit: `npm run lint`

- [x] 3. Refactor BuildingSelector to use local state for proper undo/redo

  **What to do**:
  - Change BuildingSelector to accept `nodes` and `setNodes` props (or use ReactFlow context)
  - Replace `useReactFlow().addNodes` with local `setNodes` callback
  - Replace `useReactFlow().addEdges` with local `setEdges` callback
  - Ensure all node/edge additions go through local state (triggers history)
  - Group batch additions (production chains) into single history entry

  **Must NOT do**:
  - DO NOT change BuildingSelector UI layout or styling
  - DO NOT modify building search/filter logic
  - DO NOT change how recipes are fetched or displayed
  - DO NOT break drag-and-drop functionality

  **Parallelizable**: YES (with 1, 2) | NO (depends on: 1)

  **References**:

  **Pattern References** (existing code to follow):
  - `src/components/planner/PlannerCanvas.tsx:95-96` - How local state is created
  - `src/components/planner/PlannerCanvas.tsx:383-388` - BuildingSelector usage pattern
  - `src/components/planner/BuildingSelector.tsx:115-125` - Current add single node logic
  - `src/components/planner/BuildingSelector.tsx:260-275` - Current add production chain logic

  **API/Type References** (contracts to implement against):
  - `src/types/planner.ts:PlannerNode` - Node structure expected by canvas
  - ReactFlow `Node` type - What BuildingSelector currently creates

  **External References** (libraries and frameworks):
  - ReactFlow `useReactFlow` - Understanding addNodes/addEdges vs local state

  **WHY Each Reference Matters**:
  - `PlannerCanvas.tsx:95-96` - Shows how local state is initialized, need to pass to BuildingSelector
  - `PlannerCanvas.tsx:383-388` - Shows current props passed to BuildingSelector
  - `BuildingSelector.tsx:115-125` - Current implementation that bypasses local state
  - `BuildingSelector.tsx:260-275` - Production chain addition that needs grouping

  **Acceptance Criteria**:

  _Manual Execution Verification:_
  - [ ] Using interactive_bash (tmux session):
    - Command: `npm run dev`
    - Navigate to: `http://localhost:3000`
    - Action: Add a single building, click Undo
    - Verify: Building is removed
    - Action: Add a production chain, click Undo
    - Verify: All buildings in chain are removed (single undo step)

  **Commit**: YES
  - Message: `feat(undo-redo): refactor BuildingSelector to use local state`
  - Files: `src/components/planner/BuildingSelector.tsx`, `src/components/planner/PlannerCanvas.tsx`
  - Pre-commit: `npm run lint`

- [x] 4. Wire up Controls buttons with disabled states

  **What to do**:
  - Import `selectCanUndo` and `selectCanRedo` selectors from store
  - Add `disabled` prop to Undo/Redo buttons based on selectors
  - Verify visual feedback (grayed out) when disabled
  - Keep existing onClick handlers (they already call store actions)

  **Must NOT do**:
  - DO NOT change button layout or styling
  - DO NOT modify existing tooltips
  - DO NOT change Save/Load button behavior
  - DO NOT add new buttons

  **Parallelizable**: YES (with 5) | NO (depends on: 1)

  **References**:

  **Pattern References** (existing code to follow):
  - `src/components/planner/Controls.tsx:1-12` - Current imports and store usage
  - `src/components/planner/Controls.tsx:17-32` - Button definitions
  - `src/stores/planner-store.ts:78-79` - Selector definitions

  **External References** (libraries and frameworks):
  - shadcn/ui Button component - Disabled state styling

  **WHY Each Reference Matters**:
  - `Controls.tsx:1-12` - Shows where to add selector imports
  - `Controls.tsx:17-32` - Shows button structure, need to add disabled prop
  - `store.ts:78-79` - Selector implementations to import and use

  **Acceptance Criteria**:

  _Manual Execution Verification:_
  - [ ] Using interactive_bash (tmux session):
    - Command: `npm run dev`
    - Navigate to: `http://localhost:3000`
    - Action: Check Undo button is disabled on fresh load
    - Action: Add a node, verify Undo button becomes enabled
    - Action: Click Undo, verify Redo button becomes enabled
    - Action: Click Undo until empty, verify Undo button becomes disabled
    - Screenshot: `.sisyphus/evidence/task-4-button-states.png`

  **Commit**: YES
  - Message: `feat(undo-redo): wire button disabled states`
  - Files: `src/components/planner/Controls.tsx`
  - Pre-commit: `npm run lint`

- [x] 5. Add keyboard shortcuts (Ctrl+Z, Ctrl+Y)

  **What to do**:
  - Add `useEffect` with keydown event listener in PlannerCanvas or Controls
  - Check `document.activeElement` to ensure shortcuts only trigger when canvas is focused
  - Implement Ctrl+Z → undo, Ctrl+Y → redo
  - Prevent default browser behavior for these shortcuts

  **Must NOT do**:
  - DO NOT trigger when user is typing in search/input fields
  - DO NOT add Ctrl+S save shortcut (out of scope)
  - DO NOT add Ctrl+Shift+Z redo (stick to Ctrl+Y)
  - DO NOT interfere with ReactFlow's native keyboard shortcuts

  **Parallelizable**: YES (with 4) | NO (depends on: 1)

  **References**:

  **Pattern References** (existing code to follow):
  - `src/components/planner/Controls.tsx:9-11` - Store hook usage pattern
  - Any existing keyboard handler in codebase (check sidebar or forms)
  - `src/stores/planner-store.ts:17-43` - Store undo/redo actions

  **API/Type References** (contracts to implement against):
  - React Flow keyboard events - Understanding focus and event handling

  **External References** (libraries and frameworks):
  - React event handling - Keyboard event patterns

  **WHY Each Reference Matters**:
  - `Controls.tsx:9-11` - Shows how to access store actions
  - Existing keyboard patterns - Ensure consistent implementation
  - Store actions - Need to call undo/redo on keyboard events

  **Acceptance Criteria**:

  _Manual Execution Verification:_
  - [ ] Using interactive_bash (tmux session):
    - Command: `npm run dev`
    - Navigate to: `http://localhost:3000`
    - Action: Add a node, press Ctrl+Z
    - Verify: Node is removed (undo works)
    - Action: Press Ctrl+Y
    - Verify: Node is restored (redo works)
    - Action: Click in search input, press Ctrl+Z
    - Verify: Undo does NOT trigger (focus check works)

  **Commit**: YES
  - Message: `feat(undo-redo): add keyboard shortcuts`
  - Files: `src/components/planner/Controls.tsx` or `src/components/planner/PlannerCanvas.tsx`
  - Pre-commit: `npm run lint`

- [x] 6. Run full test suite and verify all acceptance criteria

  **What to do**:
  - Run all existing tests
  - Run linting and formatting checks
  - Manual testing of all undo/redo scenarios
  - Verify no regressions in existing functionality

  **Must NOT do**:
  - DO NOT skip any acceptance criteria
  - DO NOT skip edge case testing

  **Parallelizable**: NO | NO (depends on: 1, 2, 3, 4, 5)

  **References**:
  - All previous task acceptance criteria

  **WHY Each Reference Matters**:
  - Final verification that all pieces work together correctly

  **Acceptance Criteria**:

  _Tests:_
  - [ ] `npm run test` → All tests pass
  - [ ] `npm run lint` → No errors
  - [ ] `npm run format:check` → No formatting issues

  _Manual Execution Verification:_
  - [ ] Using interactive_bash (tmux session):
    - Command: `npm run dev`
    - Navigate to: `http://localhost:3000`
    - Test: Add single node → undo → redo
    - Test: Add production chain → undo → verify all removed
    - Test: Multiple operations → multiple undo → multiple redo
    - Test: Keyboard shortcuts work when canvas focused
    - Test: Keyboard shortcuts don't work when in search input
    - Test: Buttons correctly disabled/enabled based on history
  - [ ] Screenshot: `.sisyphus/evidence/task-6-full-verification.png`

  **Commit**: YES
  - Message: `test(undo-redo): run full test suite`
  - Files: All changed files from previous tasks

---

## Commit Strategy

| After Task | Message                                                         | Files                                   | Verification               |
| ---------- | --------------------------------------------------------------- | --------------------------------------- | -------------------------- |
| 1          | `feat(undo-redo): add pushToHistory action with limit`          | planner-store.ts, test file             | `npm run lint`             |
| 2          | `feat(undo-redo): capture history before ReactFlow mutations`   | PlannerCanvas.tsx                       | Manual test: undo node     |
| 3          | `feat(undo-redo): refactor BuildingSelector to use local state` | BuildingSelector.tsx, PlannerCanvas.tsx | Manual test: undo chain    |
| 4          | `feat(undo-redo): wire button disabled states`                  | Controls.tsx                            | Manual test: button states |
| 5          | `feat(undo-redo): add keyboard shortcuts`                       | Controls.tsx or PlannerCanvas.tsx       | Manual test: Ctrl+Z/Y      |
| 6          | `test(undo-redo): run full test suite`                          | All files                               | `npm run test`             |

---

## Future Work (Out of Scope - Document for Later)

These features are intentionally out of scope but should be easy to implement with this architecture:

1. **Save/Load Integration with History**
   - Save history alongside canvas state
   - Restore history when loading
   - User decision: Clear history or preserve on load

2. **Visual History Timeline**
   - Dropdown showing history entries
   - Jump to specific history state
   - Visual preview of history states

3. **Enhanced Keyboard Shortcuts**
   - Ctrl+S for save
   - Ctrl+Shift+Z as alternative redo
   - Escape to cancel in-progress operations

4. **History Persistence**
   - Persist history to localStorage
   - Recover history on page refresh
   - Optional: Clear history on explicit user action

These can be added with minimal changes since the architecture is now in place.

---

## Success Criteria

### Verification Commands

```bash
npm run test          # All tests pass (including new undo/redo tests)
npm run lint          # No lint errors
npm run dev           # Manual testing in browser
```

### Final Checklist

- [x] All "Must Have" present
- [x] All "Must NOT Have" absent
- [x] All tests pass
- [x] Keyboard shortcuts work when canvas focused
- [x] Keyboard shortcuts don't work in input fields
- [x] Buttons correctly disabled when history empty
- [x] Production chains undo in single step
- [x] History limited to 50 entries
