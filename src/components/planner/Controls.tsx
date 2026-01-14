'use client'

import { memo, useEffect, useCallback } from 'react'
import { Controls } from '@xyflow/react'
import { Button } from '@/components/ui/button'
import { Undo, Redo } from 'lucide-react'
import {
  usePlannerStore,
  selectCanUndo,
  selectCanRedo,
} from '@/stores/planner-store'

function ControlsComponent() {
  const { undo, redo } = usePlannerStore()
  const canUndo = usePlannerStore(selectCanUndo)
  const canRedo = usePlannerStore(selectCanRedo)

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if typing in an input field
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      // Ctrl+Z = Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (canUndo) undo()
      }

      // Ctrl+Y = Redo (standard) or Ctrl+Shift+Z = Redo (alternative)
      if (
        ((e.ctrlKey || e.metaKey) && e.key === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')
      ) {
        e.preventDefault()
        if (canRedo) redo()
      }
    },
    [undo, redo, canUndo, canRedo],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <>
      <Controls />
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <Button
          size="icon"
          variant="outline"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          <Undo className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
        >
          <Redo className="w-4 h-4" />
        </Button>
      </div>
    </>
  )
}

export default memo(ControlsComponent)
