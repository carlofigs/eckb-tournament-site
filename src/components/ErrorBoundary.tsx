import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Top-level error boundary so a runtime error in any page doesn't
 * white-screen the whole app. React Router has its own
 * `errorElement` mechanism but it's per-route — this catches errors
 * during initial mount, in shared shells, and in places Router
 * doesn't see (event handlers still need their own try/catch).
 *
 * Class component because React error boundaries still require it.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    // Log to the browser console — there's no remote error sink yet
    // (Sentry-style). Worth adding before non-POC scale.
    console.error('App crashed:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground">
        <div className="max-w-md w-full bg-card border rounded-xl p-6 shadow">
          <div className="text-3xl mb-3" aria-hidden>
            ⚠️
          </div>
          <h1 className="text-xl font-extrabold mb-2">Something broke.</h1>
          <p className="text-sm text-muted-foreground mb-4">
            The app hit a runtime error and couldn't continue rendering.
            Reloading usually fixes it. If it keeps happening, check the
            browser console for the error message and let an organiser know.
          </p>
          <pre className="bg-secondary border rounded p-2 text-xs overflow-x-auto mb-4">
            {this.state.error.message || String(this.state.error)}
          </pre>
          <div className="flex gap-2">
            <Button onClick={() => window.location.reload()}>Reload</Button>
            <Button
              variant="outline"
              onClick={() => this.setState({ error: null })}
            >
              Try to recover
            </Button>
          </div>
        </div>
      </div>
    )
  }
}
