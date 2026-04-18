import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { ClipboardCheck, Search, Trash2, Upload } from 'lucide-react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Separator } from '#/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { Textarea } from '#/components/ui/textarea'
import {
  type CriterionGrade,
  type Policy,
  type Submission,
  useAppData,
} from '#/lib/mock-data'

export const Route = createFileRoute('/')({ component: SubmissionsPage })

const ALL_POLICIES = 'all'

function SubmissionsPage() {
  const {
    policies,
    submissions,
    addSubmission,
    deleteSubmission,
    getPolicyName,
    getPolicyTotalPoints,
    getSubmissionScore,
    saveSubmissionGrades,
  } = useAppData()
  const [search, setSearch] = useState('')
  const [policyFilter, setPolicyFilter] = useState(ALL_POLICIES)

  const filteredSubmissions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return submissions.filter((submission) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        submission.label.toLowerCase().includes(normalizedSearch)
      const matchesPolicy =
        policyFilter === ALL_POLICIES || submission.policyId === policyFilter

      return matchesSearch && matchesPolicy
    })
  }, [policyFilter, search, submissions])

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Submissions</h2>
        </div>
        <AddSubmissionDialog policies={policies} onAddSubmission={addSubmission} />
      </div>

      <Card>
        <CardContent className="grid gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative md:max-w-sm md:flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                placeholder="Search labels"
                className="pl-9"
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Select value={policyFilter} onValueChange={setPolicyFilter}>
              <SelectTrigger className="w-full md:w-[240px]">
                <SelectValue placeholder="Filter by policy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_POLICIES}>All policies</SelectItem>
                {policies.map((policy) => (
                  <SelectItem key={policy.id} value={policy.id}>
                    {policy.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Policy</TableHead>
                  <TableHead>Zip file</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Manual score</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubmissions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-28 text-center text-muted-foreground"
                    >
                      No submissions match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubmissions.map((submission) => {
                    const policy = policies.find(
                      (item) => item.id === submission.policyId
                    )
                    const totalPoints = policy ? getPolicyTotalPoints(policy) : 0
                    const score = getSubmissionScore(submission)

                    return (
                      <TableRow key={submission.id}>
                        <TableCell className="font-medium">
                          {submission.label}
                        </TableCell>
                        <TableCell>{getPolicyName(submission.policyId)}</TableCell>
                        <TableCell>{submission.fileName}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{submission.status}</Badge>
                        </TableCell>
                        <TableCell>
                          {policy ? `${score} / ${totalPoints}` : 'No policy'}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            {policy ? (
                              <ManualGradeDialog
                                policy={policy}
                                submission={submission}
                                onSave={(grades) =>
                                  saveSubmissionGrades(submission.id, grades)
                                }
                              />
                            ) : null}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Delete ${submission.label}`}
                              onClick={() => deleteSubmission(submission.id)}
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

function AddSubmissionDialog({
  policies,
  onAddSubmission,
}: {
  policies: Policy[]
  onAddSubmission: (submission: {
    label: string
    policyId: string
    fileName: string
  }) => void
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [policyId, setPolicyId] = useState('')
  const [zipFile, setZipFile] = useState<File | null>(null)

  const canSubmit = label.trim().length > 0 && policyId.length > 0 && zipFile

  function resetForm() {
    setLabel('')
    setPolicyId('')
    setZipFile(null)
    formRef.current?.reset()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canSubmit || !zipFile) {
      return
    }

    onAddSubmission({
      label: label.trim(),
      policyId,
      fileName: zipFile.name,
    })
    resetForm()
    setOpen(false)
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
        <Button>
          <Upload />
          Add submission
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add submission</DialogTitle>
          <DialogDescription>
            Add a label, select the grading policy, and upload the zipped folder.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="submission-label">Submission label</Label>
            <Input
              id="submission-label"
              value={label}
              placeholder="Team Alpha dashboard"
              onChange={(event) => setLabel(event.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="submission-policy">Policy</Label>
            <Select
              value={policyId}
              onValueChange={setPolicyId}
              disabled={policies.length === 0}
            >
              <SelectTrigger id="submission-policy" className="w-full">
                <SelectValue placeholder="Select a policy" />
              </SelectTrigger>
              <SelectContent>
                {policies.map((policy) => (
                  <SelectItem key={policy.id} value={policy.id}>
                    {policy.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="submission-zip">Zip folder upload</Label>
            <Input
              id="submission-zip"
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              onChange={(event) =>
                setZipFile(event.target.files?.item(0) ?? null)
              }
            />
            <p className="text-xs text-muted-foreground">
              Upload one zipped project folder per submission.
            </p>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={!canSubmit}>
              Add submission
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ManualGradeDialog({
  policy,
  submission,
  onSave,
}: {
  policy: Policy
  submission: Submission
  onSave: (grades: CriterionGrade[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [draftGrades, setDraftGrades] = useState<Record<string, CriterionGrade>>(
    {}
  )

  useEffect(() => {
    if (!open) {
      return
    }

    const gradesByCriterion = new Map(
      submission.grades.map((grade) => [grade.criterionId, grade])
    )

    setDraftGrades(
      Object.fromEntries(
        policy.criteria.map((criterion) => {
          const savedGrade = gradesByCriterion.get(criterion.id)

          return [
            criterion.id,
            {
              criterionId: criterion.id,
              score: savedGrade?.score ?? 0,
              feedback: savedGrade?.feedback ?? '',
            },
          ]
        })
      )
    )
  }, [open, policy.criteria, submission.grades])

  const totalScore = Object.values(draftGrades).reduce(
    (total, grade) => total + grade.score,
    0
  )
  const totalPoints = policy.criteria.reduce(
    (total, criterion) => total + criterion.points,
    0
  )

  function updateGrade(
    criterionId: string,
    field: 'score' | 'feedback',
    value: string,
    maxScore: number
  ) {
    setDraftGrades((current) => {
      const currentGrade = current[criterionId] ?? {
        criterionId,
        score: 0,
        feedback: '',
      }

      return {
        ...current,
        [criterionId]: {
          ...currentGrade,
          [field]:
            field === 'score'
              ? Math.min(Math.max(Number(value) || 0, 0), maxScore)
              : value,
        },
      }
    })
  }

  function handleSave() {
    onSave(Object.values(draftGrades))
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <ClipboardCheck />
          Grade
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Manual grading</DialogTitle>
          <DialogDescription>
            Review {submission.label} against {policy.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-4">
            <div>
              <p className="text-sm font-medium">{submission.fileName}</p>
              <p className="text-sm text-muted-foreground">
                Manual score: {totalScore} / {totalPoints}
              </p>
            </div>
            <Badge variant="secondary">{submission.status}</Badge>
          </div>

          <Separator />

          {policy.criteria.map((criterion) => {
            const grade = draftGrades[criterion.id] ?? {
              criterionId: criterion.id,
              score: 0,
              feedback: '',
            }

            return (
              <div key={criterion.id} className="grid gap-3 rounded-lg border p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-medium">{criterion.label}</h3>
                    <p className="text-sm text-muted-foreground">
                      {criterion.description || 'No description provided.'}
                    </p>
                  </div>
                  <Badge>{criterion.points} pts</Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                  <div className="grid gap-2">
                    <Label htmlFor={`${submission.id}-${criterion.id}-score`}>
                      Score
                    </Label>
                    <Input
                      id={`${submission.id}-${criterion.id}-score`}
                      type="number"
                      min="0"
                      max={criterion.points}
                      value={grade.score}
                      onChange={(event) =>
                        updateGrade(
                          criterion.id,
                          'score',
                          event.target.value,
                          criterion.points
                        )
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`${submission.id}-${criterion.id}-feedback`}>
                      Feedback
                    </Label>
                    <Textarea
                      id={`${submission.id}-${criterion.id}-feedback`}
                      value={grade.feedback}
                      placeholder="Notes for this rubric item"
                      onChange={(event) =>
                        updateGrade(
                          criterion.id,
                          'feedback',
                          event.target.value,
                          criterion.points
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <DialogFooter>
          <Button type="button" onClick={handleSave}>
            Save manual grades
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
