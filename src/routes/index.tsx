import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const navigate = useNavigate({ from: '/' })

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">Starrupture Planner</h1>
        <p className="text-muted-foreground text-lg">
          Plan your factory with visual node-based editor
        </p>
        <Button size="lg" onClick={() => navigate({ to: '/planner' })}>
          Open Planner
        </Button>
      </div>
    </div>
  )
}
