'use client'

import { memo } from 'react'
import { Controls } from '@xyflow/react'
import { Button } from '@/components/ui/button'
import { Undo, Redo } from 'lucide-react'
import { usePlannerStore } from '@/stores/planner-store'

function ControlsComponent() {
  const { undo, redo } = usePlannerStore()

  return (
    <>
      <Controls />
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <Button
          size="icon"
          variant="outline"
          onClick={undo}
          title="Undo (Ctrl+Z)"
        >
          <Undo className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={redo}
          title="Redo (Ctrl+Y)"
        >
          <Redo className="w-4 h-4" />
        </Button>
      </div>
    </>
  )
}

export default memo(ControlsComponent)
