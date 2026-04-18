import { useEffect, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAppData } from '#/lib/app-data'

export function RequireAuth({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const { authenticated, authLoading } = useAppData()

  useEffect(() => {
    if (!authLoading && !authenticated) {
      void navigate({ to: '/' })
    }
  }, [authLoading, authenticated, navigate])

  if (authLoading) {
    return (
      <main className="mx-auto grid min-h-[60vh] w-full max-w-6xl place-items-center px-4 py-8 text-sm text-muted-foreground">
        Checking session...
      </main>
    )
  }

  if (!authenticated) {
    return null
  }

  return children
}
