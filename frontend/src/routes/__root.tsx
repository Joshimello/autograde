import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
  useRouterState,
} from '@tanstack/react-router'

import { Button } from '#/components/ui/button'
import { AppDataProvider, useAppData } from '#/lib/app-data'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Autograde',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function RootLayout() {
  return (
    <AppDataProvider>
      <AppShell />
    </AppDataProvider>
  )
}

function AppShell() {
  const { authenticated, logout, user } = useAppData()
  const isRootPage = useRouterState({
    select: (state) => state.location.pathname === '/',
  })
  const showHeader = authenticated && !isRootPage

  return (
    <div className="min-h-screen bg-background text-foreground">
      {showHeader ? (
        <header className="border-b bg-card">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
            <nav className="flex min-w-0 items-center gap-2">
              <NavLink to="/submissions">Submissions</NavLink>
              <NavLink to="/policies">Policies</NavLink>
              <NavLink to="/settings">Settings</NavLink>
            </nav>
            <div className="flex min-w-0 items-center gap-3">
              <span className="truncate text-sm text-muted-foreground">
                {user?.email}
              </span>
              <Button type="button" variant="outline" size="sm" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </header>
      ) : null}
      <Outlet />
    </div>
  )
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

function NavLink({
  children,
  to,
}: {
  children: React.ReactNode
  to: '/submissions' | '/policies' | '/settings'
}) {
  return (
    <Link
      to={to}
      className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
      activeProps={{
        className:
          'rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground',
      }}
    >
      {children}
    </Link>
  )
}
