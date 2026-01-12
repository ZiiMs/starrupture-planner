'use client'

import { memo } from 'react'
import { MiniMap } from '@xyflow/react'

function MinimapComponent() {
  return (
    <MiniMap
      nodeColor={() => {
        return 'var(--primary)'
      }}
      nodeStrokeWidth={3}
      zoomable
      pannable
    />
  )
}

export default memo(MinimapComponent)
