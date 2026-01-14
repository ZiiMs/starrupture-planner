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

function HydrationWaiter() {
  const [, setTick] = useState(0)

  useEffect(() => {
    let hasHydrated = false

    const unsubFinish = usePlannerStore.persist.onFinishHydration(() => {
      hasHydrated = true
      setTick(t => t + 1)
    })

    usePlannerStore.persist.rehydrate()

    const timeout = setTimeout(() => {
      if (!hasHydrated) {
        hasHydrated = true
        setTick(t => t + 1)
      }
    }, 100)

    return () => {
      unsubFinish()
      clearTimeout(timeout)
    }
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
        <HydrationWaiter />
        <Suspense fallback={<LoadingFallback />}>
          <PlannerCanvas />
        </Suspense>
      </ReactFlowProvider>
    </QueryClientProvider>
  )
}
