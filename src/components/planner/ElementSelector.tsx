'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getIcon } from '@/lib/icons'
import type { Building, Item } from '@/types/planner'
import { Search, X } from 'lucide-react'
import { memo, useMemo } from 'react'

interface ElementSelectorProps {
  type: 'buildings' | 'items'
  buildings: Record<string, Building>
  items: Record<string, Item>
  onSelectBuilding: (buildingId: string) => void
  onSelectItem: (itemId: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
}

function ElementSelectorComponent({
  type,
  buildings,
  items,
  onSelectBuilding,
  onSelectItem,
  searchQuery,
  onSearchChange,
}: ElementSelectorProps) {
  const data = type === 'buildings' ? buildings : items
  const dataArray = Object.values(data)

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return dataArray
    const query = searchQuery.toLowerCase()
    return dataArray.filter((item) =>
      item.name.toLowerCase().includes(query),
    )
  }, [dataArray, searchQuery])

  const categories = useMemo(() => {
    return Array.from(new Set(filteredData.map((item) => item.category)))
  }, [filteredData])

  const clearSearch = () => {
    onSearchChange('')
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={type === 'buildings' ? 'Search buildings...' : 'Search items...'}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      <ScrollArea className="h-[300px]">
        {filteredData.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-sm text-muted-foreground">
            No {type} found
          </div>
        ) : (
          <div className="space-y-4">
            {categories.map((category) => {
              const itemsInCategory = filteredData.filter(
                (item) => item.category === category,
              )
              if (itemsInCategory.length === 0) return null

              const IconComponent = getIcon(type === 'buildings' ? 'Building' : 'Package')

              return (
                <div key={category}>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2 capitalize flex items-center gap-2">
                    <IconComponent className="h-3 w-3" />
                    {category.replace('-', ' ')}
                  </h4>
                  <div className="flex flex-col gap-1">
                    {itemsInCategory.map((item) => {
                      const ItemIcon = getIcon(item.icon)
                      return (
                        <Button
                          key={item.id}
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            type === 'buildings'
                              ? onSelectBuilding(item.id)
                              : onSelectItem(item.id)
                          }
                          className="justify-start gap-2 h-auto py-2 px-3"
                        >
                          <div
                            className="w-6 h-6 rounded-sm flex items-center justify-center bg-accent shrink-0"
                            style={{
                              color: item.iconColor || 'var(--foreground)',
                            }}
                          >
                            <ItemIcon className="w-4 h-4" />
                          </div>
                          <span className="text-xs truncate">{item.name}</span>
                        </Button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

export default memo(ElementSelectorComponent)
