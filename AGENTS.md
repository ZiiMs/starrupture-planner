# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-12
**Commit:** ee02f1a
**Branch:** ziim/init-deep

## OVERVIEW

TanStack Start + React + TypeScript + shadcn/ui template. File-based routing, full-stack capabilities via Nitro, comprehensive UI component library.

## STRUCTURE

```
./
├── src/
│   ├── components/ui/    # shadcn/ui components (53 components)
│   ├── routes/           # TanStack Start file-based routing
│   ├── lib/              # Utilities (cn() for Tailwind)
│   └── hooks/            # React hooks (useIsMobile)
└── public/               # Static assets
```

## WHERE TO LOOK

| Task             | Location                                          | Notes                              |
| ---------------- | ------------------------------------------------- | ---------------------------------- |
| Add route        | `src/routes/*.tsx`                                | File-based: `createFileRoute('/')` |
| Add component    | `src/components/*.tsx`                            | Non-UI: custom components          |
| Add UI component | `src/components/ui/*.tsx`                         | shadcn/ui: copy + adapt            |
| Styling          | `src/styles.css`                                  | Tailwind v4 via @tailwindcss/vite  |
| Config           | `vite.config.ts`, `tsconfig.json`, `package.json` | Build, type, deps                  |

## CODE MAP

| Symbol          | Type     | Location                           | Refs | Role                      |
| --------------- | -------- | ---------------------------------- | ---- | ------------------------- |
| createFileRoute | Function | src/routes/\*.tsx                  | 3    | Route definition          |
| getRouter       | Function | src/router.tsx                     | 1    | Router instance factory   |
| cn              | Function | src/lib/utils.ts                   | 58+  | Tailwind class merger     |
| useIsMobile     | Hook     | src/hooks/use-mobile.ts            | ?    | Mobile breakpoint (768px) |
| Route (export)  | Const    | src/routes/\_\_root.tsx, index.tsx | 2    | TanStack route exports    |

## CONVENTIONS

- **Path aliases**: `@/*` maps to `./src/*` (tsconfig)
- **Component props**: `React.ComponentProps<"tagName">` + spread + `className` merge via `cn()`
- **Variants**: CVA (`class-variance-authority`) for UI component variants
- **asChild pattern**: Radix UI `Slot.Root` for polymorphic components
- **Styling**: Tailwind v4 CSS-first, no separate config file
- **Icons**: `lucide-react` - all imports explicitly listed in components
- **DevTools**: TanStack Router Devtools + React Devtools enabled in dev
- **Formatting**: Prettier (semi: false, singleQuote: true, trailingComma: all)

## ANTI-PATTERNS (THIS PROJECT)

- No test files currently (vitest configured but none written)
- No eslint config beyond TanStack defaults
- No separate Tailwind config (uses v4 CSS-first approach)

## UNIQUE STYLES

- **Button variants**: Custom `data-slot` attributes for targeting (`data-slot="button"`)
- **Icon positioning**: `data-icon="inline-start"` / `data-icon="inline-end"` for spacing
- **Component examples**: `Example` and `ExampleWrapper` wrappers for UI showcase
- **Route exports**: Always export `Route` const from `createFileRoute()`
- **Styling**: Rounded-none design system (no rounded corners by default)

## COMMANDS

```bash
npm run dev      # Start dev server (port 3000)
npm run build    # Production build
npm run preview  # Preview production build
npm run test     # Run vitest (currently no tests)
npm run lint     # Run eslint
npm run format   # Run prettier
npm run check    # prettier --write && eslint --fix
```

## NOTES

- TanStack Start uses Nitro for SSR/API routes
- Route tree auto-generated (`routeTree.gen.ts`) - do not edit manually
- shadcn/ui components are fully customizable (copy into project)
- UI components use Radix UI primitives with custom styling
