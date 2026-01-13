'use client'

import { Component, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: { componentStack?: string }) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex items-center justify-center h-screen">
            <div className="text-center space-y-4">
              <div className="text-destructive text-lg font-semibold">Something went wrong</div>
              <div className="text-muted-foreground text-sm">
                {this.state.error?.message || 'Unknown error'}
              </div>
              <button
                onClick={() => {
                  this.setState({ hasError: false })
                  window.location.reload()
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-none"
              >
                Reload Page
              </button>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}
