import { createFileRoute } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactFlowProvider } from '@xyflow/react'
import PlannerCanvas from '@/components/planner/PlannerCanvas'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
    },
  },
})

export const Route = createFileRoute('/planner')({
  component: PlannerPage,
})

function PlannerPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <ReactFlowProvider>
        <PlannerCanvas />
      </ReactFlowProvider>
    </QueryClientProvider>
  )
}
