import {
  HeadContent,
  Link,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'

import { AppDataProvider } from '#/lib/mock-data'
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
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="antialiased">
        <AppDataProvider>
          <div className="min-h-screen bg-background text-foreground">
            <header className="border-b bg-card">
              <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Autograde
                  </p>
                  <h1 className="text-2xl font-semibold tracking-tight">
                    Grading Control
                  </h1>
                </div>
                <nav className="flex gap-2">
                  <Link
                    to="/"
                    activeOptions={{ exact: true }}
                    className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
                    activeProps={{
                      className:
                        'rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground',
                    }}
                  >
                    Submissions
                  </Link>
                  <Link
                    to="/policies"
                    className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
                    activeProps={{
                      className:
                        'rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground',
                    }}
                  >
                    Policies
                  </Link>
                </nav>
              </div>
            </header>
            {children}
          </div>
        </AppDataProvider>
        <Scripts />
      </body>
    </html>
  )
}
