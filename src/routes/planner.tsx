'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { ReactFlowProvider } from '@xyflow/react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { usePlannerStore } from '@/stores/planner-store'

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

function HydrationTrigger() {
  const [, setTick] = useState(0)

  useEffect(() => {
    // Rehydrate and force re-render when done
    Promise.resolve(usePlannerStore.persist.rehydrate()).then(() => {
      setTick(t => t + 1)
    })
  }, [])

  return null
}

export const Route = createFileRoute('/planner')({
  component: PlannerPage,
})

function PlannerPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <ReactFlowProvider>
        <HydrationTrigger />
        <Suspense fallback={<LoadingFallback />}>
          <PlannerCanvas />
        </Suspense>
      </ReactFlowProvider>
    </QueryClientProvider>
  )
}
