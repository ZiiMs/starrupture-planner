'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { ReactFlowProvider } from '@xyflow/react'
import { lazy, Suspense } from 'react'

const PlannerCanvas = lazy(() => import('@/components/planner/PlannerCanvas'))

// Create single stable QueryClient outside component
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
