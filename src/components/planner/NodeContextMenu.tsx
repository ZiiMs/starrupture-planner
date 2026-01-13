'use client'

import { useRef } from 'react'
import { Trash2, Plug, ArrowUpFromDot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOnClickOutside } from '@/hooks/use-on-click-outside'

interface NodeContextMenuProps {
  top?: number
  left?: number
  right?: number
  bottom?: number
  onClick: () => void
  onDeleteNode: () => void
  onAddInputConnector: () => void
  onAddOutputConnector: () => void
}

export function NodeContextMenu({
  top,
  left,
  right,
  bottom,
  onClick,
  onDeleteNode,
  onAddInputConnector,
  onAddOutputConnector,
}: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useOnClickOutside(menuRef, onClick)

  return (
    <div
      ref={menuRef}
      className="absolute bg-popover text-popover-foreground min-w-36 rounded-none shadow-md ring-1 ring-foreground/10 z-50 p-1"
      style={{ top, left, right, bottom }}
    >
      <button
        onClick={onDeleteNode}
        className={cn(
          'w-full flex items-center gap-2 px-2 py-2 text-xs rounded-none',
          'hover:bg-accent hover:text-accent-foreground',
          'focus:bg-accent focus:text-accent-foreground',
          'outline-hidden cursor-default select-none',
        )}
      >
        <Trash2 className="h-4 w-4" />
        Delete Node
      </button>
      <button
        onClick={onAddInputConnector}
        className={cn(
          'w-full flex items-center gap-2 px-2 py-2 text-xs rounded-none',
          'hover:bg-accent hover:text-accent-foreground',
          'focus:bg-accent focus:text-accent-foreground',
          'outline-hidden cursor-default select-none',
        )}
      >
        <Plug className="h-4 w-4" />
        Add Input Connector
      </button>
      <button
        onClick={onAddOutputConnector}
        className={cn(
          'w-full flex items-center gap-2 px-2 py-2 text-xs rounded-none',
          'hover:bg-accent hover:text-accent-foreground',
          'focus:bg-accent focus:text-accent-foreground',
          'outline-hidden cursor-default select-none',
        )}
      >
        <ArrowUpFromDot className="h-4 w-4" />
        Add Output Connector
      </button>
    </div>
  )
}
