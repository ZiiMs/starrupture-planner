# Work Plan: Fix Context Menu Positioning and Dismissal

**Status**: Ready for Implementation  
**Priority**: High  
**Estimated Time**: 30-45 minutes

---

## Problem Statement

The context menu on ReactFlow nodes has two critical issues:

1. **Incorrect positioning**: The menu does not appear at the cursor position
2. **Dismissal failure**: Left-clicking outside the context menu does not close it

---

## Root Cause Analysis

### Issue 1: Positioning Offset

**Location**: `src/components/planner/PlannerCanvas.tsx`, lines 80-87

**Current Code**:
```typescript
setMenu({
  id: node.id,
  top: event.clientY < pane.height - 200 ? event.clientY : undefined,
  left: event.clientX < pane.width - 200 ? event.clientX : undefined,
  right: event.clientX >= pane.width - 200 ? pane.width - event.clientX : undefined,
  bottom: event.clientY >= pane.height - 200 ? pane.height - event.clientY : undefined,
})
```

**Problem**: 
- `event.clientX/clientY` are viewport-relative coordinates
- The context menu is positioned absolutely relative to the wrapper div (which may have an offset from viewport)
- Missing offset adjustment: `event.clientY - pane.top` and `event.clientX - pane.left`

### Issue 2: Click-Outside Not Working

**Location**: `src/components/planner/NodeContextMenu.tsx`, lines 28-34

**Current Code**:
```typescript
<div
  className="absolute..."
  style={{ top, left, right, bottom }}
  onClick={(e) => {
    e.stopPropagation()
    onClick()
  }}
>
```

**Problem**:
- The parent div has an `onClick` handler with `stopPropagation()`
- This prevents clicks on buttons inside from propagating correctly
- Button clicks are swallowed by parent's `onClick`, triggering `onPaneClick` and closing the menu prematurely
- No robust click-outside detection mechanism exists

---

## Solution Architecture

### Fix 1: Correct Positioning (5 minutes)

**File**: `src/components/planner/PlannerCanvas.tsx`

Adjust coordinates by subtracting wrapper offset from viewport coordinates:

```typescript
setMenu({
  id: node.id,
  top: event.clientY < pane.height - 200 ? event.clientY - pane.top : undefined,
  left: event.clientX < pane.width - 200 ? event.clientX - pane.left : undefined,
  right: event.clientX >= pane.width - 200 ? pane.right - event.clientX : undefined,
  bottom: event.clientY >= pane.height - 200 ? pane.bottom - event.clientY : undefined,
})
```

**Why this works**:
- Converts viewport-relative `clientX/Y` to wrapper-relative coordinates
- Maintains existing boundary detection logic
- No API changes, simple coordinate adjustment

---

### Fix 2: Remove Problematic Parent Click Handler (5 minutes)

**File**: `src/components/planner/NodeContextMenu.tsx`

Remove the `onClick` handler from the parent div:

```typescript
<div
  className="absolute bg-popover text-popover-foreground min-w-36 rounded-none shadow-md ring-1 ring-foreground/10 z-50 p-1"
  style={{ top, left, right, bottom }}
>
```

**Why this works**:
- Removes `stopPropagation()` that was blocking button clicks
- Allows existing `onPaneClick` in `PlannerCanvas.tsx` to handle dismissal
- Simplifies component logic

---

### Fix 3: Add useOnClickOutside Hook (15-20 minutes)

**Create**: `src/hooks/use-on-click-outside.ts`

```typescript
import { useEffect } from 'react'

type Event = MouseEvent | TouchEvent

export function useOnClickOutside<T extends HTMLElement = HTMLElement>(
  ref: React.RefObject<T>,
  callback: (event: Event) => void,
  eventType: 'mousedown' | 'mouseup' | 'touchstart' | 'touchend' = 'mousedown',
) {
  useEffect(() => {
    const listener = (event: Event) => {
      const el = ref?.current
      
      // Do nothing if clicking ref's element or descendant elements
      if (!el || el.contains(event?.target as Node)) {
        return
      }
      
      callback(event)
    }

    document.addEventListener(eventType, listener)
    
    return () => {
      document.removeEventListener(eventType, listener)
    }
  }, [ref, callback, eventType])
}
```

**Update**: `src/components/planner/NodeContextMenu.tsx`

```typescript
import { useRef } from 'react'
import { useOnClickOutside } from '@/hooks/use-on-click-outside'

export function NodeContextMenu({ /*...*/ }: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useOnClickOutside(menuRef, onClick)

  return (
    <div
      ref={menuRef}
      className="absolute bg-popover text-popover-foreground min-w-36 rounded-none shadow-md ring-1 ring-foreground/10 z-50 p-1"
      style={{ top, left, right, bottom }}
    >
      {/* buttons unchanged */}
    </div>
  )
}
```

**Why this works**:
- Provides robust click-outside detection using standard pattern
- Used by Microsoft FluentUI, shadcn/ui, and other major libraries
- Handles nested elements correctly via `el.contains()`
- Works with both mouse and touch events

---

### Enhancement: Add Keyboard Dismissal (Optional, 5 minutes)

**File**: `src/components/planner/PlannerCanvas.tsx`

Add to existing `useEffect` (lines 177-200):

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // ... existing Ctrl+Z, Ctrl+Y, Ctrl+S handlers ...

    // NEW: Escape key dismisses context menu
    if (e.key === 'Escape' && menu) {
      e.preventDefault()
      setMenu(null)
    }
  }

  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [saveToLocalStorage, menu]) // Add menu to dependency array
```

**Why this works**:
- Follows accessibility standards
- Standard UI pattern (used by MUI, Radix UI, etc.)
- Provides user-friendly dismissal option

---

## Implementation Steps

### Step 1: Fix Positioning Offset
**File**: `src/components/planner/PlannerCanvas.tsx`
- Navigate to line 80-87 in `onNodeContextMenu` callback
- Change `event.clientY` to `event.clientY - pane.top`
- Change `event.clientX` to `event.clientX - pane.left`
- Change `pane.height` to `pane.bottom` (for bottom boundary)
- Change `pane.width` to `pane.right` (for right boundary)

### Step 2: Create useOnClickOutside Hook
**File**: `src/hooks/use-on-click-outside.ts` (new file)
- Create new hook file in `src/hooks/` directory
- Copy implementation from plan above
- Verify TypeScript types export correctly

### Step 3: Update NodeContextMenu Component
**File**: `src/components/planner/NodeContextMenu.tsx`
- Import `useRef` from React
- Import `useOnClickOutside` from `@/hooks/use-on-click-outside`
- Add `const menuRef = useRef<HTMLDivElement>(null)` inside component
- Add `useOnClickOutside(menuRef, onClick)` hook call
- Add `ref={menuRef}` to the parent div
- Remove `onClick` and `stopPropagation()` from parent div

### Step 4: Add Keyboard Dismissal (Optional)
**File**: `src/components/planner/PlannerCanvas.tsx`
- Locate existing `useEffect` with keyboard handlers (lines 177-200)
- Add Escape key handler as shown in plan
- Update dependency array to include `menu`

---

## Testing Checklist

### Manual Testing Required

**Test Case 1: Positioning**
- [ ] Right-click on a node near top-left corner
- [ ] Verify menu appears directly under cursor
- [ ] Right-click on a node near bottom-right corner  
- [ ] Verify menu doesn't overflow viewport

**Test Case 2: Dismissal via Click Outside**
- [ ] Open context menu on a node
- [ ] Left-click on empty canvas area
- [ ] Verify menu closes immediately

**Test Case 3: Button Actions**
- [ ] Open context menu
- [ ] Click "Delete Node" button
- [ ] Verify node is deleted and menu closes
- [ ] Click "Add Input Connector" button
- [ ] Verify connector is added and menu closes
- [ ] Click "Add Output Connector" button
- [ ] Verify connector is added and menu closes

**Test Case 4: Keyboard Dismissal (if implemented)**
- [ ] Open context menu
- [ ] Press Escape key
- [ ] Verify menu closes

**Test Case 5: Multiple Menus**
- [ ] Open context menu on Node A
- [ ] Right-click on Node B without closing first
- [ ] Verify menu moves to Node B position
- [ ] Verify only one menu is visible at a time

**Test Case 6: Edge Cases**
- [ ] Open context menu, then drag a node
- [ ] Verify menu stays closed
- [ ] Resize browser window with menu open
- [ ] Verify menu stays open (or closes gracefully)

---

## Code Changes Summary

| File | Lines Changed | Type | Risk |
|------|--------------|------|------|
| `PlannerCanvas.tsx` | 4-5 lines | Coordinate math fix | Low |
| `NodeContextMenu.tsx` | 6-8 lines | Hook integration, removal | Low |
| `hooks/use-on-click-outside.ts` | 35 lines (new) | New hook | None |
| **Total** | **~50 lines** | - | **Low** |

---

## Risk Assessment

**Overall Risk**: Low

**Potential Issues**:
- None identified. Changes are localized and follow established patterns.

**Rollback Plan**:
- If positioning is worse, revert coordinate adjustments
- If click-outside still fails, verify `useOnClickOutside` implementation matches plan
- All changes are additive or simple arithmetic - no refactoring required

---

## Alternatives Considered

### Alternative A: Use ReactFlow NodeToolbar
- **Pros**: Zero positioning code, built-in
- **Cons**: Less flexible UI, different UX pattern
- **Decision**: Not suitable for custom context menu requirements

### Alternative B: Use Radix UI ContextMenu
- **Pros**: Best-in-class accessibility
- **Cons**: Requires major refactor, breaking changes
- **Decision**: Overkill for this use case

### Alternative C: Keep current implementation with debug
- **Pros**: No new code
- **Cons**: Doesn't fix the issues
- **Decision**: Not acceptable

---

## Success Criteria

- [ ] Context menu appears exactly at cursor position
- [ ] Left-clicking anywhere outside menu closes it
- [ ] Button clicks work correctly without closing menu prematurely
- [ ] No console errors or warnings
- [ ] Accessibility improved (keyboard dismissal if implemented)

---

## Dependencies

- React 18+ (already in project)
- TypeScript (already in project)
- No new npm packages required

---

## Notes

- The positioning fix converts viewport coordinates to wrapper-relative coordinates
- The `useOnClickOutside` hook is a well-established pattern used by major UI libraries
- Existing `onPaneClick` in `PlannerCanvas.tsx` provides redundancy for dismissal
- The solution maintains ReactFlow's recommended patterns
