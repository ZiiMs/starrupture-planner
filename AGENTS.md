# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-12
**Commit:** ee02f1a
**Branch:** ziim/init-deep

## OVERVIEW

TanStack Start + React + TypeScript + shadcn/ui template. ReactFlow canvas planner, Zustand state management, TanStack Query for data. File-based routing with Nitro SSR.

## STRUCTURE

```
./
├── src/
│   ├── components/
│   │   ├── ui/          # shadcn/ui components (53 components)
│   │   └── planner/     # ReactFlow planner components
│   ├── routes/          # TanStack Start file-based routing
│   ├── lib/             # Utilities (cn(), calculations, icons)
│   ├── hooks/           # React hooks (useIsMobile, usePlannerData)
│   ├── types/           # TypeScript type definitions
│   ├── data/            # Static JSON data (buildings, items, recipes)
│   └── stores/          # Zustand stores
└── public/              # Static assets
```

## WHERE TO LOOK

| Task             | Location                    | Notes                              |
| ---------------- | --------------------------- | ---------------------------------- |
| Add route        | `src/routes/*.tsx`          | File-based: `createFileRoute('/')` |
| Add component    | `src/components/*.tsx`      | Non-UI: custom components          |
| Add UI component | `src/components/ui/*.tsx`   | shadcn/ui: copy + adapt            |
| Planner logic    | `src/components/planner/`   | ReactFlow + Zustand patterns       |
| State management | `src/stores/`               | Zustand stores                     |
| Data fetching    | `src/hooks/`                | TanStack Query hooks               |
| Utilities        | `src/lib/`                  | cn(), calculations, icons          |
| Static data      | `src/data/*.json`           | buildings, items, recipes         |
| Styling          | `src/styles.css`            | Tailwind v4 via @tailwindcss/vite  |
| Config           | `vite.config.ts`, tsconfig.json, package.json | Build, type, deps |

## CODE MAP

| Symbol          | Type     | Location              | Refs | Role                      |
| --------------- | -------- | --------------------- | ---- | ------------------------- |
| createFileRoute | Function | src/routes/*.tsx      | 3    | Route definition          |
| getRouter       | Function | src/router.tsx        | 1    | Router instance factory   |
| usePlannerStore | Hook     | src/stores/planner-store.ts | ?  | Zustand store              |
| ReactFlow       | Component| src/components/planner/PlannerCanvas.tsx | ? | Canvas renderer           |
| cn              | Function | src/lib/utils.ts      | 58+  | Tailwind class merger     |
| useIsMobile     | Hook     | src/hooks/use-mobile.ts | ?  | Mobile breakpoint (768px) |
| usePlannerData  | Hook     | src/hooks/use-planner-data.ts | ? | TanStack Query data hook   |
| Route (export)  | Const    | src/routes/__root.tsx, index.tsx | 2 | TanStack route exports    |

## CONVENTIONS

- **Path aliases**: `@/*` maps to `./src/*` (tsconfig)
- **Component props**: `React.ComponentProps<"tagName">` + spread + `className` merge via `cn()`
- **Variants**: CVA (`class-variance-authority`) for UI component variants
- **asChild pattern**: Radix UI `Slot.Root` for polymorphic components
- **Styling**: Tailwind v4 CSS-first, no separate config file
- **Icons**: `lucide-react` - all imports explicitly listed in components
- **DevTools**: TanStack Router Devtools + React Devtools enabled in dev
- **Formatting/Linting**: oxlint + oxfmt (Rust-based, faster than ESLint/Prettier)
- **Data attributes**: `data-slot`, `data-icon` for component targeting

## ANTI-PATTERNS (THIS PROJECT)

- No test files currently (vitest configured but none written)
- No CI/CD workflows configured
- Missing `src/entry-client.tsx` and `src/entry-server.tsx` (TanStack Start requirement)
- Don't edit `routeTree.gen.ts` - auto-generated
- Don't store TanStack Query output in Zustand - use Query directly

## UNIQUE STYLES

- **Button variants**: Custom `data-slot` attributes for targeting (`data-slot="button"`)
- **Icon positioning**: `data-icon="inline-start"` / `data-icon="inline-end"` for spacing
- **Component examples**: `Example` and `ExampleWrapper` wrappers for UI showcase
- **Route exports**: Always export `Route` const from `createFileRoute()`
- **Styling**: Rounded-none design system (no rounded corners by default)
- **State management**: Zustand for planner state, TanStack Query for server data
- **Canvas**: ReactFlow for node-based planner interface

## COMMANDS

```bash
npm run dev      # Start dev server (port 3000)
npm run build    # Production build
npm run preview  # Preview production build
npm run test     # Run vitest (currently no tests)
npm run lint     # Run oxlint
npm run lint:fix # Run oxlint with auto-fix
npm run format   # Run oxfmt
npm run format:check # Check formatting without changing
npm run check    # oxfmt && oxlint --fix
```

## NOTES

- TanStack Start uses Nitro for SSR/API routes
- Route tree auto-generated (`routeTree.gen.ts`) - do not edit manually
- shadcn/ui components are fully customizable (copy into project)
- UI components use Radix UI primitives with custom styling
- ReactFlow handles planner canvas with custom nodes and edges
- Zustand manages planner state (selections, connections, history)
- TanStack Query fetches planner data with infinite stale time
- oxlint/oxfmt replace ESLint/Prettier for performance
- Missing entry files: `src/entry-client.tsx`, `src/entry-server.tsx` (create these to enable proper SSR)

## DOCUMENTATION LINKS

- TanStack Start: https://tanstack.com/start/latest
- TanStack Router: https://tanstack.com/router/latest
- ReactFlow: https://reactflow.dev/api-reference
- Nitro: https://nitro.build/guide
- Shadcn/UI: https://ui.shadcn.com
