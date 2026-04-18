import { Link, createFileRoute } from '@tanstack/react-router'
import { Edit, Plus, Trash2 } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { useAppData } from '#/lib/app-data'

export const Route = createFileRoute('/policies/')({ component: PoliciesPage })

function PoliciesPage() {
  const {
    policies,
    submissions,
    loading,
    error,
    deletePolicy,
    getPolicyTotalPoints,
  } = useAppData()

  function getAssignedCount(policyId: string) {
    return submissions.filter((submission) => submission.policyId === policyId)
      .length
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Policies</h2>
        </div>
        <Button asChild>
          <Link to="/policies/new">
            <Plus />
            New policy
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent>
          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Loading policies...
            </div>
          ) : policies.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No policies yet. Create a policy to make submissions gradeable.
            </div>
          ) : (
            <div className="rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Criteria</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies.map((policy) => {
                    const assignedCount = getAssignedCount(policy.id)

                    return (
                      <TableRow key={policy.id}>
                        <TableCell className="font-medium">
                          {policy.name}
                        </TableCell>
                        <TableCell className="max-w-sm truncate text-muted-foreground">
                          {policy.description || 'No description'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {policy.criteria.length}
                          </Badge>
                        </TableCell>
                        <TableCell>{getPolicyTotalPoints(policy)}</TableCell>
                        <TableCell>{assignedCount}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button asChild variant="outline" size="sm">
                              <Link
                                to="/policies/$policyId"
                                params={{ policyId: policy.id }}
                              >
                                <Edit />
                                Edit
                              </Link>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Delete ${policy.name}`}
                              disabled={assignedCount > 0}
                              title={
                                assignedCount > 0
                                  ? 'Assigned policies cannot be deleted'
                                  : 'Delete policy'
                              }
                              onClick={() => void deletePolicy(policy.id)}
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
