import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultNotFoundComponent: NotFound,
  })

  return router
}

function NotFound() {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-3xl place-items-center px-4 py-16 text-center">
      <div className="grid gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Not found</h1>
        <p className="text-muted-foreground">
          The page you requested does not exist.
        </p>
        <div>
          <Button asChild>
            <Link to="/">Go home</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
