# src/routes - TanStack Start File-Based Routing

**Generated:** 2026-01-12

## OVERVIEW

TanStack Start file-based routing. SSR-enabled via Nitro. Route tree auto-generated from files.

## STRUCTURE

```
src/routes/
├── __root.tsx       # Root layout (html, head, body, devtools)
├── index.tsx        # Home route (/)
└── planner.tsx      # Planner route (/planner) with ReactFlow canvas
```

## WHERE TO LOOK

| Task         | File               | Notes                                   |
| ------------ | ------------------ | --------------------------------------- |
| Root layout  | `__root.tsx`       | HTML structure, global styles, devtools |
| Add route    | `*.tsx`            | File path = route path                  |
| Route tree   | `routeTree.gen.ts` | Auto-generated, DO NOT EDIT             |
| Entry points | `entry-client.tsx` | MISSING - create for client hydration   |
| Entry points | `entry-server.tsx` | MISSING - create for SSR                |

## CONVENTIONS

- **Route definition**: `export const Route = createFileRoute('/')({ component: App })`
- **Component**: Named function exported from route file
- **Layout**: `shellComponent` in root route wraps all children
- **DevTools**: TanStack Router Devtools + React Devtools in root
- **Styles**: Global CSS via `import appCss from '../styles.css?url'`
- **Loading states**: Use TanStack Start's built-in Suspense for async routes
- **Navigation**: Use `<Link />` from `@tanstack/react-router` for client-side navigation

## ANTI-PATTERNS

- Don't edit `routeTree.gen.ts` - it's auto-generated
- Don't add routes outside `src/routes/`
- Don't use `asChild` for route links - use `<Link />` from TanStack Router
- Don't forget to create `entry-client.tsx` and `entry-server.tsx` for proper SSR
- Don't manually manage history - use TanStack Router's built-in history management
