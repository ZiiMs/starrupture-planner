import * as LucideIcons from 'lucide-react'

export function getIcon(name: string): any {
  const icon = (LucideIcons as Record<string, any>)[name]
  return icon || LucideIcons.Box
}

export const ICON_MAPPINGS = {
  mining: 'Package',
  drill: 'Drill',
  excavator: 'Package',
  miner: 'Pickaxe',

  smelting: 'Factory',
  furnace: 'Flame',
  smelter: 'Factory',

  crafting: 'Wrench',
  assembler: 'Wrench',
  constructor: 'Hammer',

  storage: 'Warehouse',
  container: 'Box',

  power: 'Zap',
  generator: 'Bolt',

  transport: 'Truck',
  conveyor: 'ArrowRight',
  pipe: 'Pipette',

  'raw-resource': 'Package',
  ore: 'Package',

  'processed-material': 'Square',
  bar: 'Square',
  plate: 'Square',

  component: 'Cog',
  gear: 'Cog',
  circuit: 'Cpu',

  product: 'Box',
  'finished-good': 'Package',
} as const

export const COMMON_ICONS = {
  'ore-excavator': 'Package',
  'mining-drill': 'Drill',
  'oil-pump': 'Droplet',
  'water-pump': 'Waves',
  'gas-extractor': 'Wind',

  smelter: 'Factory',
  furnace: 'Flame',
  'electric-furnace': 'Zap',
  refinery: 'Chemical',

  assembler: 'Wrench',
  constructor: 'Hammer',
  manufacturer: 'Cog',
  packager: 'Box',

  container: 'Box',
  'storage-tank': 'Warehouse',
  'industrial-container': 'Package',

  generator: 'Bolt',
  'power-pole': 'Zap',
  battery: 'BatteryCharging',

  conveyor: 'ArrowRight',
  pipe: 'Pipette',
  'truck-station': 'Truck',
  'train-station': 'Train',

  'raw-ore': 'Package',
  'iron-ore': 'Package',
  'copper-ore': 'Package',
  'iron-plate': 'Square',
  'iron-gear': 'Cog',
  'copper-wire': 'Cable',
  concrete: 'Square',
  screw: 'Screw',
  rod: 'Pencil',
} as const

export const ICON_COLORS = {
  iron: '#8B4513',
  copper: '#B87333',
  gold: '#FFD700',
  silver: '#C0C0C0',
  wolfram: '#8B4513',

  extraction: '#8B4513',
  smelting: '#FF6B35',
  crafting: '#4ECDC4',
  power: '#FFE66D',
  storage: '#95A5A6',
  transport: '#3498DB',
} as const
