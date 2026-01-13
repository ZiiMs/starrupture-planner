# src/lib - Utilities & Helper Functions

**Generated:** 2026-01-12

## OVERVIEW

Core utilities used across the application. Tailwind class merging, icon mappings, and business logic calculations.

## STRUCTURE

```
src/lib/
├── utils.ts         # cn() utility for Tailwind class merging
├── icons.ts         # Icon mappings and getIcon() helper
├── calculations.ts  # Business logic (output rates, power consumption)
└── data.ts          # Data transformation utilities
```

## WHERE TO LOOK

| Task           | File            | Notes                                    |
| -------------- | --------------- | ---------------------------------------- |
| Class merging  | utils.ts        | cn() - used in 58+ files across project |
| Icons          | icons.ts        | getIcon() mapping for Lucide icons      |
| Calculations   | calculations.ts | Output rates, power consumption, recipes |
| Data helpers   | data.ts         | Data loading and transformation          |

## CONVENTIONS

- **cn()**: Always use for merging Tailwind classes: `cn(baseClasses, variantClasses, className)`
- **Icons**: Import Lucide icons explicitly in components, use `getIcon()` helper for dynamic icon names
- **Calculations**: Pure functions with no side effects
- **Type safety**: All exports properly typed with TypeScript

## ANTI-PATTERNS

- Don't use inline string concatenation for classes - always use `cn()`
- Don't hardcode icon names - use `getIcon()` helper
- Don't mutate input data in calculations - return new objects
- Don't use `any` types - all functions properly typed
