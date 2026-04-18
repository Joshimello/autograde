import { type FormEvent, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Plus, Trash2 } from 'lucide-react'
import { RequireAuth } from '#/components/RequireAuth'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { useAppData } from '#/lib/app-data'

export const Route = createFileRoute('/settings')({
  component: SettingsRoute,
})

function SettingsRoute() {
  return (
    <RequireAuth>
      <SettingsPage />
    </RequireAuth>
  )
}

function SettingsPage() {
  const {
    whitelist,
    loading,
    error,
    addWhitelistEntry,
    updateWhitelistEntry,
    deleteWhitelistEntry,
  } = useAppData()
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!email.trim()) {
      return
    }

    setSaving(true)
    try {
      await addWhitelistEntry({ email })
      setEmail('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
      </div>

      <form
        className="grid gap-3 sm:grid-cols-[minmax(0,360px)_auto] sm:items-end"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-2">
          <Label htmlFor="whitelist-email">Allowed GitHub email</Label>
          <Input
            id="whitelist-email"
            type="email"
            value={email}
            placeholder="instructor@example.com"
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={!email.trim() || saving}>
          <Plus />
          {saving ? 'Adding...' : 'Add email'}
        </Button>
      </form>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell
                colSpan={3}
                className="h-28 text-center text-muted-foreground"
              >
                Loading settings...
              </TableCell>
            </TableRow>
          ) : whitelist.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={3}
                className="h-28 text-center text-muted-foreground"
              >
                No allowed emails yet.
              </TableCell>
            </TableRow>
          ) : (
            whitelist.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="font-medium">{entry.email}</TableCell>
                <TableCell>
                  <Badge variant={entry.active ? 'secondary' : 'outline'}>
                    {entry.active ? 'Allowed' : 'Disabled'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        void updateWhitelistEntry(entry.id, {
                          active: !entry.active,
                        })
                      }
                    >
                      {entry.active ? 'Disable' : 'Enable'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${entry.email}`}
                      onClick={() => void deleteWhitelistEntry(entry.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </main>
  )
}
