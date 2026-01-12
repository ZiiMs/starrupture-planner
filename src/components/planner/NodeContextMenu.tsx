'use client'

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
} from '@/components/ui/context-menu'
import { Trash2, Plug, ArrowUpFromDot } from 'lucide-react'

interface NodeContextMenuProps {
  onMenuClose: () => void
  onDeleteNode: () => void
  onAddInputConnector: () => void
  onAddOutputConnector: () => void
}

export function NodeContextMenu({
  onMenuClose,
  onDeleteNode,
  onAddInputConnector,
  onAddOutputConnector,
}: NodeContextMenuProps) {
  return (
    <ContextMenu onOpenChange={(open) => !open && onMenuClose()}>
      <ContextMenuContent>
        <ContextMenuItem onClick={onDeleteNode}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Node
        </ContextMenuItem>
        <ContextMenuItem onClick={onAddInputConnector}>
          <Plug className="mr-2 h-4 w-4" />
          Add Input Connector
        </ContextMenuItem>
        <ContextMenuItem onClick={onAddOutputConnector}>
          <ArrowUpFromDot className="mr-2 h-4 w-4" />
          Add Output Connector
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
