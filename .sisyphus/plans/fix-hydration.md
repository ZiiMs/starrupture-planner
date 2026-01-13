# Plan: Fix React Hydration Errors

## Problem Analysis

The application has persistent hydration errors:

1. "Expected server HTML to contain a matching <title> in <head>"
2. "Hydration failed because the initial UI does not match what was rendered on the server"
3. Error happens at `HeadContent` (TanStack Router's head management component)

### Root Causes Identified

1. **TanStack Router's HeadContent component**: This client component manages `<head>` elements during hydration and may modify/reorder elements differently than SSR rendered them.

2. **useState/useEffect timing**: The `mounted` state causes a double render:
   - SSR renders: `LoadingFallback` (because `!mounted`)
   - Initial client render: `LoadingFallback` (because `!mounted`)
   - After useEffect: Client tries to render actual content
   - This transition causes hydration mismatch

3. **Conditional rendering during hydration**: React doesn't like when elements appear/disappear between SSR and hydration.

4. **QueryClient creation**: Creating QueryClient inside the component with useMemo causes instability.

## Solution Strategy

### Option A: Completely Skip SSR (Recommended for this app)

Since this is a client-heavy app with ReactFlow, we can skip SSR entirely:

1. Create `entry-client.tsx` - Client-side only entry
2. Create `entry-server.tsx` - Minimal server entry that returns static HTML
3. Configure vite.config.ts to use static export

### Option B: Fix Hydration Properly

Keep SSR but fix the issues:

1. **Remove all useState/useEffect mounted checks** - They cause double renders
2. **Create QueryClient outside component** - Single stable instance
3. **Use suppressHydrationWarning on all elements**
4. **Avoid HeadContent issues** - Use static head elements only

### Option C: Use hydrateRoot with suppressHydrationWarning

Use React 18's hydrateRoot with mismatch handling.

## Recommended Approach: Option A (Complete SSR Skip)

Given the complexity of ReactFlow and the app's client-heavy nature, complete SSR skip is cleanest.

## Implementation Steps (Option A)

### Step 1: Create entry-client.tsx

```tsx
import { hydrateRoot } from 'react-dom/client'
import { StartClient } from '@tanstack/react-router-devtools'
import { createRouter } from './router'

const router = createRouter()

hydrateRoot(document, <StartClient router={router} />)
```

### Step 2: Create entry-server.tsx

```tsx
import { createStartContext } from '@tanstack/react-start/context'
import { createMemoryHistory } from '@tanstack/react-router'
import { createRouter } from './router'

export async function getLoadContext() {
  return {}
}

export const {
  createHydrateContext,
  Hydrate,
  ServerContext,
  serverOnlyLoadContext,
} = createStartContext({
  router: () => router,
  loadContext: getLoadContext,
})
```

### Step 3: Configure vite.config.ts for static export

```ts
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'

export default defineConfig({
  plugins: [
    tanstackStart({
      ssr: false, // Disable SSR
    }),
  ],
})
```

### Step 4: Simplify planner.tsx

Remove all the mounted/isHydrating complexity:

```tsx
'use client'

import { createFileRoute } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactFlowProvider } from '@xyflow/react'
import { lazy, Suspense } from 'react'

const PlannerCanvas = lazy(() => import('@/components/planner/PlannerCanvas'))

// Create single stable QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
})

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-sm text-muted-foreground">Loading planner...</div>
    </div>
  )
}

export const Route = createFileRoute('/planner')({
  component: PlannerPage,
})

function PlannerPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <ReactFlowProvider>
        <Suspense fallback={<LoadingFallback />}>
          <PlannerCanvas />
        </Suspense>
      </ReactFlowProvider>
    </QueryClientProvider>
  )
}
```

### Step 5: Simplify \_\_root.tsx

Remove ErrorBoundary and client-only checks:

```tsx
import { TanStackDevtools } from '@tanstack/react-devtools'
import {
  HeadContent,
  Scripts,
  createRootRoute,
  Outlet,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    title: 'Starrupture Planner',
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="bg-background">
        {children}
        <TanStackDevtools
          config={{ position: 'bottom-right' }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  return <Outlet />
}
```

## Verification Plan

1. Run `npm run dev`
2. Navigate to /planner
3. Verify no hydration errors in console
4. Verify ReactFlow canvas loads correctly
5. Verify BuildingSelector sidebar is visible
6. Test adding buildings and connections

## Files to Modify

| File                     | Change                                             |
| ------------------------ | -------------------------------------------------- |
| `src/entry-client.tsx`   | NEW - Client entry point                           |
| `src/entry-server.tsx`   | NEW - Server entry point (minimal)                 |
| `vite.config.ts`         | ADD - ssr: false option                            |
| `src/routes/planner.tsx` | SIMPLIFY - Remove mounted/isHydrating              |
| `src/routes/__root.tsx`  | SIMPLIFY - Remove ErrorBoundary, client-only logic |
| `src/routes/index.tsx`   | SIMPLIFY - Remove mounted check if present         |

## Success Criteria

- [ ] No hydration errors in console
- [ ] ReactFlow canvas renders correctly
- [ ] BuildingSelector sidebar works
- [ ] Node creation and connections work
- [ ] Edge efficiency visualization displays
- [ ] Recipe dropdown selects work
- [ ] No regression in existing functionality
