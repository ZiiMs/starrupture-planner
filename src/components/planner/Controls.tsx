'use client'

import { Button } from '@/components/ui/button'
import {
  selectCanRedo,
  selectCanUndo,
  usePlannerStore,
} from '@/stores/planner-store'
import { Controls } from '@xyflow/react'
import { Redo, Trash2, Undo } from 'lucide-react'
import { memo, useCallback, useEffect, useState } from 'react'
import LayoutControls from './LayoutControls'

function ControlsComponent() {
  const { undo, redo, clearAll } = usePlannerStore()
  const canUndo = usePlannerStore(selectCanUndo)
  const canRedo = usePlannerStore(selectCanRedo)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleClear = useCallback(() => {
    if (showConfirm) {
      clearAll()
      setShowConfirm(false)
    } else {
      setShowConfirm(true)
    }
  }, [clearAll, showConfirm])
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

      // Clear confirmation state on any key press
      if (showConfirm) {
        setShowConfirm(false)
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
    [undo, redo, canUndo, canRedo, showConfirm],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown, handleClear])

  return (
    <>
      <Controls />
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <LayoutControls />

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
        <Button
          size="icon"
          variant={showConfirm ? 'destructive' : 'outline'}
          onClick={handleClear}
          title={showConfirm ? 'Click again to confirm' : 'Clear all'}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </>
  )
}

export default memo(ControlsComponent)
