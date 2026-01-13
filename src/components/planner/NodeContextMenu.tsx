'use client'

import { useRef, useState } from 'react'
import { Trash2, Plug, ArrowUpFromDot, Minus } from 'lucide-react'
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
  onRemoveInputConnector?: (connectorId: string) => void
  onRemoveOutputConnector?: (connectorId: string) => void
  customInputs?: Array<{ id: string }>
  customOutputs?: Array<{ id: string }>
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
  onRemoveInputConnector,
  onRemoveOutputConnector,
  customInputs = [],
  customOutputs = [],
}: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [showRemoveInputMenu, setShowRemoveInputMenu] = useState(false)
  const [showRemoveOutputMenu, setShowRemoveOutputMenu] = useState(false)

  useOnClickOutside(menuRef, () => {
    onClick()
    setShowRemoveInputMenu(false)
    setShowRemoveOutputMenu(false)
  })

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

      {customInputs.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setShowRemoveInputMenu(!showRemoveInputMenu)}
            className={cn(
              'w-full flex items-center gap-2 px-2 py-2 text-xs rounded-none',
              'hover:bg-accent hover:text-accent-foreground',
              'focus:bg-accent focus:text-accent-foreground',
              'outline-hidden cursor-default select-none',
            )}
          >
            <Minus className="h-4 w-4" />
            Remove Input Connector
          </button>
          {showRemoveInputMenu && (
            <div className="absolute left-full top-0 ml-1 bg-popover text-popover-foreground min-w-36 rounded-none shadow-md ring-1 ring-foreground/10 z-50 p-1">
              {customInputs.map((input) => (
                <button
                  key={input.id}
                  onClick={() => {
                    onRemoveInputConnector?.(input.id)
                    setShowRemoveInputMenu(false)
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-2 text-xs rounded-none',
                    'hover:bg-accent hover:text-accent-foreground',
                    'focus:bg-accent focus:text-accent-foreground',
                    'outline-hidden cursor-default select-none',
                  )}
                >
                  {input.id}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {customOutputs.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setShowRemoveOutputMenu(!showRemoveOutputMenu)}
            className={cn(
              'w-full flex items-center gap-2 px-2 py-2 text-xs rounded-none',
              'hover:bg-accent hover:text-accent-foreground',
              'focus:bg-accent focus:text-accent-foreground',
              'outline-hidden cursor-default select-none',
            )}
          >
            <Minus className="h-4 w-4" />
            Remove Output Connector
          </button>
          {showRemoveOutputMenu && (
            <div className="absolute left-full top-0 ml-1 bg-popover text-popover-foreground min-w-36 rounded-none shadow-md ring-1 ring-foreground/10 z-50 p-1">
              {customOutputs.map((output) => (
                <button
                  key={output.id}
                  onClick={() => {
                    onRemoveOutputConnector?.(output.id)
                    setShowRemoveOutputMenu(false)
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-2 text-xs rounded-none',
                    'hover:bg-accent hover:text-accent-foreground',
                    'focus:bg-accent focus:text-accent-foreground',
                    'outline-hidden cursor-default select-none',
                  )}
                >
                  {output.id}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
