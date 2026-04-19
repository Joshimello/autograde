import { type FormEvent, useRef, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Edit, FileUp, Plus, Trash2 } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
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
import {
  type PolicyImportStatus,
  useAppData,
} from '#/lib/app-data'

export const Route = createFileRoute('/policies/')({ component: PoliciesPage })

function PoliciesPage() {
  const {
    policies,
    policyImports,
    submissions,
    loading,
    error,
    deletePolicy,
    importPolicyDocument,
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
        <div className="flex flex-wrap gap-2">
          <ImportPolicyDialog onImportPolicyDocument={importPolicyDocument} />
          <Button asChild>
            <Link to="/policies/new">
              <Plus />
              New policy
            </Link>
          </Button>
        </div>
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

      <Card>
        <CardContent>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-medium">Document imports</h3>
          </div>

          {policyImports.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No imported policy documents yet.
            </div>
          ) : (
            <div className="rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead className="text-right">Policy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policyImports.map((policyImport) => (
                    <TableRow key={policyImport.id}>
                      <TableCell className="font-medium">
                        {policyImport.label}
                      </TableCell>
                      <TableCell>{policyImport.fileName}</TableCell>
                      <TableCell>
                        <Badge variant={policyImportVariant(policyImport.status)}>
                          {formatStatus(policyImport.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-sm truncate text-muted-foreground">
                        {policyImport.message || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {policyImport.policyId ? (
                          <Button asChild variant="outline" size="sm">
                            <Link
                              to="/policies/$policyId"
                              params={{ policyId: policyImport.policyId }}
                            >
                              <Edit />
                              Review policy
                            </Link>
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

function ImportPolicyDialog({
  onImportPolicyDocument,
}: {
  onImportPolicyDocument: (policyImport: {
    label: string
    sourceFile: File
  }) => Promise<void>
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const canSubmit = label.trim().length > 0 && sourceFile

  function resetForm() {
    setLabel('')
    setSourceFile(null)
    formRef.current?.reset()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canSubmit || !sourceFile) {
      return
    }

    setSaving(true)
    try {
      await onImportPolicyDocument({
        label: label.trim(),
        sourceFile,
      })
      resetForm()
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)

        if (!nextOpen) {
          resetForm()
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileUp />
          Import document
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import policy document</DialogTitle>
          <DialogDescription>
            Upload a PDF, DOCX, or PPTX file to create a draft grading policy.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="policy-import-label">Import label</Label>
            <Input
              id="policy-import-label"
              value={label}
              placeholder="Final project rubric"
              onChange={(event) => setLabel(event.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="policy-import-file">Source document</Label>
            <Input
              id="policy-import-file"
              type="file"
              accept=".pdf,.docx,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              onChange={(event) =>
                setSourceFile(event.target.files?.item(0) ?? null)
              }
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={!canSubmit || saving}>
              {saving ? 'Importing...' : 'Import document'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function policyImportVariant(status: PolicyImportStatus) {
  if (status === 'failed' || status === 'canceled') {
    return 'destructive'
  }

  if (status === 'succeeded') {
    return 'default'
  }

  return 'secondary'
}

function formatStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}
