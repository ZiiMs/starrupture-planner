import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAutoLayout, type LayoutDirection } from '@/hooks/useAutoLayout'
import { ArrowDown, ArrowRight, LayoutGrid } from 'lucide-react'
import { memo } from 'react'

function LayoutControlsComponent() {
  const { runAutoLayout, autoLayoutDirection, setAutoLayoutDirection } =
    useAutoLayout()

  const handleLayout = () => {
    runAutoLayout()
  }

  const handleDirectionChange = (direction: LayoutDirection) => {
    setAutoLayoutDirection(direction)
    // Also run layout immediately with new direction
    runAutoLayout(direction)
  }

  const isLR = autoLayoutDirection === 'LR'

  return (
    <div className="flex gap-2 z-10">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" title="Layout Direction">
            {isLR ? (
              <ArrowRight className="w-4 h-4" />
            ) : (
              <ArrowDown className="w-4 h-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => handleDirectionChange('LR')}
            className={isLR ? 'bg-accent' : ''}
          >
            <ArrowRight className="w-4 h-4 mr-2" />
            Left to Right
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleDirectionChange('TB')}
            className={!isLR ? 'bg-accent' : ''}
          >
            <ArrowDown className="w-4 h-4 mr-2" />
            Top to Bottom
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="outline"
        onClick={() => runAutoLayout(undefined)}
        title="Auto Layout"
        className="gap-2"
      >
        <LayoutGrid className="w-4 h-4" />
        Auto Layout
      </Button>
    </div>
  )
}

export default memo(LayoutControlsComponent)
