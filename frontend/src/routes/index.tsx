import { Link, createFileRoute } from '@tanstack/react-router'
import { LogIn } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { useAppData } from '#/lib/app-data'

export const Route = createFileRoute('/')({ component: LandingPage })

function LandingPage() {
  const { authenticated, authError, loginWithOAuth } = useAppData()

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-6xl items-center px-4 py-10">
      <section className="grid max-w-2xl gap-6">
        <div className="grid gap-3">
          <p className="text-sm font-medium text-muted-foreground">Autograde</p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Grading operations for coursework submissions.
          </h1>
          <p className="max-w-xl text-base text-muted-foreground">
            Manage rubric policies, collect zipped submissions, and review manual
            grading in one place.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {authenticated ? (
            <Button asChild size="lg">
              <Link to="/submissions">Go to Dashboard</Link>
            </Button>
          ) : (
            <Button size="lg" onClick={() => void loginWithOAuth()}>
              <LogIn />
              Login with GitHub
            </Button>
          )}
        </div>

        {authError ? (
          <div className="w-fit rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {authError}
          </div>
        ) : null}
      </section>
    </main>
  )
}
