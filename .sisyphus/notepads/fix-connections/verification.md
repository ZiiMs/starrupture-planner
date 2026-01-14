# Fix Connections - Verification Notes

## Code Change Applied

**File:** `src/components/planner/PlannerCanvas.tsx`

**Changes:**

1. Added import: `ConnectionMode` from `@xyflow/react`
2. Added prop: `connectionMode={ConnectionMode.Loose}` to `<ReactFlow>` component

## Automated Verification Results

| Check      | Status  | Command         |
| ---------- | ------- | --------------- |
| Lint       | ✅ Pass | `npm run lint`  |
| Type check | ✅ Pass | `npm run check` |
| Build      | ✅ Pass | `npm run build` |

## Manual Verification Required

**Dev Server:** Already running on port 42069

### Test Procedure

1. Open browser to: http://localhost:42069

2. **Test Scenario 1: Multiple Output Connections**
   - Add a building with multiple outputs (e.g., Smelter with 2 outputs)
   - Connect first output handle to another building
   - Connect second output handle to a different building
   - **Expected:** Both connections persist independently
   - **Previously (bug):** Second connection would disconnect the first

3. **Test Scenario 2: Multiple Input Connections**
   - Add a building with multiple inputs (e.g., Assembler with 2 inputs)
   - Connect first input from one building
   - Connect second input from another building
   - **Expected:** Both connections persist independently

4. **Test Scenario 3: Mixed (Inputs + Outputs)**
   - Create a node with 2 inputs and 2 outputs
   - Connect both inputs from different sources
   - Connect both outputs to different targets
   - **Expected:** All 4 connections persist

### Verification Checkpoints

- [ ] No connection is disconnected when creating a new connection
- [ ] Each handle maintains its own connection independently
- [ ] Drag-and-drop connection creation works correctly
- [ ] No visual glitches in connection lines

## Expected Outcome

With `connectionMode={ConnectionMode.Loose}`, ReactFlow treats each handle independently, preventing the disconnection bug where creating a new connection on one handle would affect connections on other handles.

## Rollback (if needed)

```bash
git checkout src/components/planner/PlannerCanvas.tsx
```

Or simply remove the `connectionMode` prop and import.

---

**Note:** This fix addresses the issue where connecting to a different handle on the same node would cause existing connections to disconnect.
