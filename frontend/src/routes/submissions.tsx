import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Bot,
  CircleStop,
  ClipboardCheck,
  Download,
  ExternalLink,
  Pencil,
  RotateCw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react'
import { RequireAuth } from '#/components/RequireAuth'
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
  type BuildStatus,
  type CriterionGrade,
  type Deployment,
  type DeploymentStatus,
  type GradingJob,
  type GradingJobStatus,
  type JobLog,
  type Policy,
  type Submission,
  type SubmissionResult,
  type SubmissionStatus,
  useAppData,
} from '#/lib/app-data'

export const Route = createFileRoute('/submissions')({
  component: SubmissionsRoute,
})

const ALL_POLICIES = 'all'
const ALL_STATUSES = 'all'
const submissionStatuses: SubmissionStatus[] = [
  'pending',
  'grading',
  'needs_review',
  'graded',
  'failed',
]
type LabelSortDirection = 'asc' | 'desc'

function SubmissionsRoute() {
  return (
    <RequireAuth>
      <SubmissionsPage />
    </RequireAuth>
  )
}

function SubmissionsPage() {
  const {
    policies,
    submissions,
    loading,
    error,
    addSubmission,
    cancelSubmissionGrading,
    deleteSubmission,
    updateSubmission,
    startSubmissionGrading,
    getPolicyName,
    getPolicyTotalPoints,
    getJobLogs,
    getSubmissionScore,
    getSubmissionJob,
    getSubmissionResult,
    getSubmissionDeployment,
    retrySubmissionDeployment,
    saveSubmissionGrades,
  } = useAppData()
  const [search, setSearch] = useState('')
  const [policyFilter, setPolicyFilter] = useState(ALL_POLICIES)
  const [statusFilter, setStatusFilter] = useState(ALL_STATUSES)
  const [labelSort, setLabelSort] = useState<LabelSortDirection>('asc')

  const filteredSubmissions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return submissions
      .filter((submission) => {
        const matchesSearch =
          normalizedSearch.length === 0 ||
          submission.label.toLowerCase().includes(normalizedSearch)
        const matchesPolicy =
          policyFilter === ALL_POLICIES || submission.policyId === policyFilter
        const matchesStatus =
          statusFilter === ALL_STATUSES || submission.status === statusFilter

        return matchesSearch && matchesPolicy && matchesStatus
      })
      .toSorted((first, second) => {
        const direction = labelSort === 'asc' ? 1 : -1
        return direction * first.label.localeCompare(second.label)
      })
  }, [labelSort, policyFilter, search, statusFilter, submissions])

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
          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[190px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_STATUSES}>All statuses</SelectItem>
                {submissionStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {formatStatus(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="-ml-3"
                      onClick={() =>
                        setLabelSort((current) =>
                          current === 'asc' ? 'desc' : 'asc'
                        )
                      }
                    >
                      Label
                      {labelSort === 'asc' ? <ArrowDownAZ /> : <ArrowUpAZ />}
                    </Button>
                  </TableHead>
                  <TableHead>Policy</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>AI grading</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead>Manual score</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-28 text-center text-muted-foreground"
                    >
                      Loading submissions...
                    </TableCell>
                  </TableRow>
                ) : filteredSubmissions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
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
                    const job = getSubmissionJob(submission.id)
                    const jobLogs = job ? getJobLogs(job.id) : []
                    const result = getSubmissionResult(submission.id)
                    const deployment = getSubmissionDeployment(submission.id)
                    return (
                      <TableRow key={submission.id}>
                        <TableCell className="font-medium">
                          {submission.label}
                        </TableCell>
                        <TableCell>{getPolicyName(submission.policyId)}</TableCell>
                        <TableCell>
                          <Badge variant={submissionStatusVariant(submission.status)}>
                            {formatStatus(submission.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <AIGradingDialog
                            job={job}
                            logs={jobLogs}
                            result={result}
                            submission={submission}
                            onCancel={() => {
                              if (job) {
                                void cancelSubmissionGrading(job.id)
                              }
                            }}
                            onStart={() => startSubmissionGrading(submission.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <PreviewDeploymentCell
                            deployment={deployment}
                            submission={submission}
                            onRetry={() => retrySubmissionDeployment(submission.id)}
                          />
                        </TableCell>
                        <TableCell>
                          {policy ? `${score} / ${totalPoints}` : 'No policy'}
                        </TableCell>
                        <TableCell>
                          {submission.fileUrl ? (
                            <Button
                              asChild
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              title={submission.fileName}
                            >
                              <a
                                href={submission.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`Open ${submission.fileName}`}
                              >
                                <Download />
                              </a>
                            </Button>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            {policy ? (
                              <ManualGradeDialog
                                policy={policy}
                                result={result}
                                submission={submission}
                                onSave={(grades) =>
                                  saveSubmissionGrades(submission.id, grades)
                                }
                              />
                            ) : null}
                            {policy ? (
                              <EditSubmissionDialog
                                policies={policies}
                                submission={submission}
                                onUpdateSubmission={(update) =>
                                  updateSubmission(submission.id, update)
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
    archive: File
  }) => Promise<void>
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [labelEdited, setLabelEdited] = useState(false)
  const [policyId, setPolicyId] = useState('')
  const [zipFiles, setZipFiles] = useState<File[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({
    completed: 0,
    total: 0,
    currentFile: '',
  })
  const [uploadFailures, setUploadFailures] = useState<
    Array<{ fileName: string; message: string }>
  >([])
  const [validationMessage, setValidationMessage] = useState('')

  const singleFile = zipFiles.length === 1
  const canSubmit =
    policyId.length > 0 &&
    zipFiles.length > 0 &&
    (!singleFile || label.trim().length > 0)

  useEffect(() => {
    if (zipFiles.length === 1) {
      return
    }

    setLabel('')
    setLabelEdited(false)
  }, [zipFiles.length])

  useEffect(() => {
    if (!singleFile || labelEdited) {
      return
    }

    setLabel(labelFromZipName(zipFiles[0].name))
  }, [labelEdited, singleFile, zipFiles])

  function resetForm() {
    setLabel('')
    setLabelEdited(false)
    setPolicyId('')
    setZipFiles([])
    setDragActive(false)
    setUploadProgress({ completed: 0, total: 0, currentFile: '' })
    setUploadFailures([])
    setValidationMessage('')
    formRef.current?.reset()
  }

  function addFiles(files: File[]) {
    const validFiles: File[] = []
    const invalidFiles: string[] = []

    for (const file of files) {
      if (isZipFile(file)) {
        validFiles.push(file)
      } else {
        invalidFiles.push(file.name)
      }
    }

    if (invalidFiles.length > 0) {
      setValidationMessage(
        `Only .zip files can be uploaded. Rejected: ${invalidFiles.join(', ')}`
      )
    } else {
      setValidationMessage('')
    }

    if (validFiles.length === 0) {
      return
    }

    setZipFiles((current) => mergeZipFiles(current, validFiles))
    setUploadFailures([])
  }

  function removeFile(file: File) {
    setZipFiles((current) =>
      current.filter((item) => fileKey(item) !== fileKey(file))
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canSubmit) {
      return
    }

    setSaving(true)
    setUploadFailures([])
    setUploadProgress({
      completed: 0,
      total: zipFiles.length,
      currentFile: zipFiles[0]?.name ?? '',
    })

    const failures: Array<{ fileName: string; message: string }> = []

    try {
      for (const [index, file] of zipFiles.entries()) {
        setUploadProgress({
          completed: index,
          total: zipFiles.length,
          currentFile: file.name,
        })

        try {
          await onAddSubmission({
            label: singleFile ? label.trim() : labelFromZipName(file.name),
            policyId,
            archive: file,
          })
        } catch (cause) {
          failures.push({
            fileName: file.name,
            message:
              cause instanceof Error
                ? cause.message
                : 'Unable to upload this submission.',
          })
          setUploadFailures([...failures])
        }

        setUploadProgress({
          completed: index + 1,
          total: zipFiles.length,
          currentFile: file.name,
        })
      }

      if (failures.length === 0) {
        resetForm()
        setOpen(false)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (saving) {
          return
        }

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
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add submission</DialogTitle>
          <DialogDescription>
            Select a grading policy and upload one or more zipped project folders.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="submission-policy">Policy</Label>
            <Select
              value={policyId}
              onValueChange={setPolicyId}
              disabled={policies.length === 0 || saving}
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

          {singleFile ? (
            <div className="grid gap-2">
              <Label htmlFor="submission-label">Submission label</Label>
              <Input
                id="submission-label"
                value={label}
                placeholder="Team Alpha dashboard"
                disabled={saving}
                onChange={(event) => {
                  setLabelEdited(true)
                  setLabel(event.target.value)
                }}
              />
            </div>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="submission-zip">Zip folder upload</Label>
            <button
              type="button"
              disabled={saving}
              className={[
                'grid min-h-36 place-items-center rounded-md border border-dashed p-5 text-center transition-colors',
                dragActive
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-muted/20 hover:bg-muted/40',
                saving ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
              ].join(' ')}
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={(event) => {
                event.preventDefault()
                event.stopPropagation()
                setDragActive(true)
              }}
              onDragOver={(event) => {
                event.preventDefault()
                event.stopPropagation()
                setDragActive(true)
              }}
              onDragLeave={(event) => {
                event.preventDefault()
                event.stopPropagation()
                setDragActive(false)
              }}
              onDrop={(event) => {
                event.preventDefault()
                event.stopPropagation()
                setDragActive(false)
                addFiles(Array.from(event.dataTransfer.files))
              }}
            >
              <span className="grid gap-2">
                <Upload className="mx-auto size-6 text-muted-foreground" />
                <span className="font-medium">
                  Drop zip files here or click to browse
                </span>
                <span className="text-sm text-muted-foreground">
                  {zipFiles.length === 0
                    ? 'Upload one zipped project folder per submission.'
                    : `${zipFiles.length} zip ${
                        zipFiles.length === 1 ? 'file' : 'files'
                      } selected.`}
                </span>
              </span>
            </button>
            <Input
              ref={fileInputRef}
              id="submission-zip"
              type="file"
              multiple
              className="hidden"
              accept=".zip,application/zip,application/x-zip-compressed"
              onChange={(event) =>
                addFiles(Array.from(event.target.files ?? []))
              }
            />
            {validationMessage ? (
              <p className="text-sm text-destructive">{validationMessage}</p>
            ) : null}
            {zipFiles.length > 1 ? (
              <p className="text-xs text-muted-foreground">
                Bulk labels will use each zip filename without the .zip extension.
              </p>
            ) : null}
            {zipFiles.length > 0 ? (
              <div className="grid max-h-40 gap-2 overflow-auto rounded-md border p-2">
                {zipFiles.map((file) => (
                  <div
                    key={fileKey(file)}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="truncate">
                      {file.name}
                      <span className="ml-2 text-muted-foreground">
                        {formatBytes(file.size)}
                      </span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={saving}
                      onClick={() => removeFile(file)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {saving && uploadProgress.total > 0 ? (
            <div className="grid gap-2">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${Math.round(
                      (uploadProgress.completed / uploadProgress.total) * 100
                    )}%`,
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Uploading {uploadProgress.completed} / {uploadProgress.total}
                {uploadProgress.currentFile
                  ? `: ${uploadProgress.currentFile}`
                  : ''}
              </p>
            </div>
          ) : null}

          {uploadFailures.length > 0 ? (
            <div className="grid gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
              <p className="font-medium text-destructive">
                {uploadFailures.length} upload{' '}
                {uploadFailures.length === 1 ? 'failed' : 'failures'}
              </p>
              {uploadFailures.map((failure) => (
                <p key={failure.fileName}>
                  <span className="font-medium">{failure.fileName}:</span>{' '}
                  {failure.message}
                </p>
              ))}
            </div>
          ) : null}

          <div className="text-xs text-muted-foreground">
            {zipFiles.length > 1
              ? 'Submissions will be created one by one.'
              : 'For one file, you can edit the submission label before upload.'}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={!canSubmit || saving}>
              {saving
                ? `Uploading ${uploadProgress.completed} / ${uploadProgress.total}`
                : zipFiles.length > 1
                  ? `Add ${zipFiles.length} submissions`
                  : 'Add submission'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ManualGradeDialog({
  policy,
  result,
  submission,
  onSave,
}: {
  policy: Policy
  result: SubmissionResult | null
  submission: Submission
  onSave: (grades: CriterionGrade[]) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [draftGrades, setDraftGrades] = useState<Record<string, CriterionGrade>>(
    {}
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    const sourceGrades =
      submission.grades.length > 0 ? submission.grades : result?.rubricResults ?? []
    const gradesByCriterion = new Map(
      sourceGrades.map((grade) => [grade.criterionId, grade])
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
  }, [open, policy.criteria, result?.rubricResults, submission.grades])

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

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(Object.values(draftGrades))
      setOpen(false)
    } finally {
      setSaving(false)
    }
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
            Review {submission.label} against {policy.name}. AI recommendations are
            prefilled when available.
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
            <Badge variant="secondary">{formatStatus(submission.status)}</Badge>
          </div>

          <Separator />

          {policy.criteria.map((criterion) => {
            const grade = draftGrades[criterion.id] ?? {
              criterionId: criterion.id,
              score: 0,
              feedback: '',
            }
            const aiGrade = result?.rubricResults.find(
              (item) => item.criterionId === criterion.id
            )

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

                {aiGrade ? (
                  <div className="rounded-md bg-muted/40 p-3 text-sm">
                    <p className="font-medium">
                      AI recommendation: {aiGrade.score} / {criterion.points}
                    </p>
                    {aiGrade.feedback ? (
                      <p className="mt-1 text-muted-foreground">
                        {aiGrade.feedback}
                      </p>
                    ) : null}
                  </div>
                ) : null}

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
          <Button type="button" disabled={saving} onClick={handleSave}>
            {saving
              ? 'Saving...'
              : submission.status === 'needs_review'
                ? 'Confirm grading'
                : 'Save grades'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditSubmissionDialog({
  policies,
  submission,
  onUpdateSubmission,
}: {
  policies: Policy[]
  submission: Submission
  onUpdateSubmission: (submission: {
    label: string
    policyId: string
  }) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState(submission.label)
  const [policyId, setPolicyId] = useState(submission.policyId)
  const [saving, setSaving] = useState(false)
  const canSubmit = label.trim().length > 0 && policyId.length > 0

  function resetForm() {
    setLabel(submission.label)
    setPolicyId(submission.policyId)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canSubmit) {
      return
    }

    setSaving(true)
    try {
      await onUpdateSubmission({
        label: label.trim(),
        policyId,
      })
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

        if (nextOpen) {
          resetForm()
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={`Edit ${submission.label}`}
        >
          <Pencil />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit submission</DialogTitle>
          <DialogDescription>
            Update the submission label or assigned policy.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor={`${submission.id}-edit-label`}>Submission label</Label>
            <Input
              id={`${submission.id}-edit-label`}
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`${submission.id}-edit-policy`}>Policy</Label>
            <Select
              value={policyId}
              onValueChange={setPolicyId}
              disabled={policies.length === 0}
            >
              <SelectTrigger id={`${submission.id}-edit-policy`} className="w-full">
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

          <DialogFooter>
            <Button type="submit" disabled={!canSubmit || saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AIGradingDialog({
  job,
  logs,
  result,
  submission,
  onCancel,
  onStart,
}: {
  job: GradingJob | null
  logs: JobLog[]
  result: SubmissionResult | null
  submission: Submission
  onCancel: () => void
  onStart: () => Promise<void>
}) {
  const [starting, setStarting] = useState(false)
  const isRunning = job?.status === 'queued' || job?.status === 'running'
  const canStart = !isRunning
  const logText =
    logs.length > 0
      ? logs
          .map((entry) => `[${entry.stream}] ${sanitizeLogText(entry.message)}`)
          .join('\n')
      : sanitizeLogText(
          job?.error || job?.message || 'No logs have been captured yet.'
        )
  const button = getAIButtonState(job, result)

  async function handleStart() {
    setStarting(true)
    try {
      await onStart()
    } finally {
      setStarting(false)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant={button.variant} size="sm">
          {isRunning ? <RotateCw /> : <Bot />}
          {button.label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>AI grading</DialogTitle>
          <DialogDescription>
            {submission.label}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">AI job</p>
              <Badge variant={job ? jobStatusVariant(job.status) : 'secondary'}>
                {job ? formatStatus(job.status) : 'Not queued'}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">AI score</p>
              <p className="text-sm font-medium">
                {result ? `${result.score} / ${result.maxScore}` : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Build</p>
              {result?.buildStatus ? (
                <Badge variant={buildStatusVariant(result.buildStatus)}>
                  {formatStatus(result.buildStatus)}
                </Badge>
              ) : (
                <p className="text-sm text-muted-foreground">-</p>
              )}
            </div>
          </div>

          {job?.message ? (
            <div className="grid gap-2">
              <Label>Current message</Label>
              <p className="rounded-md bg-muted p-3 text-sm">
                {sanitizeLogText(job.message)}
              </p>
            </div>
          ) : null}

          {result?.feedback ? (
            <div className="grid gap-2">
              <Label>AI feedback</Label>
              <p className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">
                {result.feedback}
              </p>
            </div>
          ) : null}

          {result?.rubricResults.length ? (
            <div className="grid gap-2">
              <Label>Rubric recommendations</Label>
              <div className="grid gap-2">
                {result.rubricResults.map((grade) => (
                  <div key={grade.criterionId} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">
                        {grade.label || grade.criterionId}
                      </p>
                      <Badge variant="secondary">
                        {grade.maxScore
                          ? `${grade.score} / ${grade.maxScore}`
                          : `${grade.score} pts`}
                      </Badge>
                    </div>
                    {grade.feedback ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {grade.feedback}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-2">
            <Label>Logs</Label>
            <pre className="max-h-[50vh] overflow-auto rounded-md bg-muted p-3 font-mono text-xs whitespace-pre-wrap">
              {logText}
            </pre>
          </div>
        </div>

        <DialogFooter>
          {isRunning ? (
            <Button type="button" variant="destructive" onClick={onCancel}>
              <CircleStop />
              Stop grading
            </Button>
          ) : (
            <Button type="button" disabled={!canStart || starting} onClick={handleStart}>
              {job?.status === 'failed' ? <RotateCw /> : <Bot />}
              {starting
                ? 'Queuing...'
                : job?.status === 'failed'
                  ? 'Retry AI grade'
                  : result
                    ? 'Run AI again'
                    : 'Start AI grade'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PreviewDeploymentCell({
  deployment,
  submission,
  onRetry,
}: {
  deployment: Deployment | null
  submission: Submission
  onRetry: () => Promise<void>
}) {
  const [retrying, setRetrying] = useState(false)
  const isRunning =
    deployment?.status === 'queued' || deployment?.status === 'building'

  async function handleRetry() {
    setRetrying(true)
    try {
      await onRetry()
    } finally {
      setRetrying(false)
    }
  }

  if (!deployment) {
    return (
      <div className="grid gap-2">
        <Badge variant="secondary">Not queued</Badge>
        <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
          {retrying ? 'Queueing...' : 'Queue preview'}
        </Button>
      </div>
    )
  }

  return (
    <div className="grid gap-2">
      <Badge variant={deploymentStatusVariant(deployment.status)}>
        {formatStatus(deployment.status)}
      </Badge>
      <p
        className="max-w-56 text-xs text-muted-foreground"
        title={deployment.error || deployment.message || submission.label}
      >
        {deployment.message ||
          deployment.error ||
          (deployment.status === 'deployed'
            ? 'Preview is ready.'
            : 'Preview has not started yet.')}
      </p>
      {deployment.status === 'deployed' && deployment.url ? (
        <Button asChild type="button" variant="outline" size="sm">
          <a href={deployment.url} target="_blank" rel="noreferrer">
            <ExternalLink />
            Open preview
          </a>
        </Button>
      ) : (
        <Button
          type="button"
          variant={deployment.status === 'failed' ? 'destructive' : 'outline'}
          size="sm"
          disabled={isRunning || retrying}
          onClick={handleRetry}
        >
          {deployment.status === 'failed' ? <RotateCw /> : null}
          {isRunning
            ? deployment.status === 'building'
              ? 'Building...'
              : 'Queued...'
            : retrying
              ? 'Queueing...'
              : deployment.status === 'failed'
                ? 'Retry preview'
                : 'Queue preview'}
        </Button>
      )}
    </div>
  )
}

function formatStatus(status: string) {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function sanitizeLogText(value: string) {
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
}

function isZipFile(file: File) {
  return file.name.toLowerCase().endsWith('.zip')
}

function labelFromZipName(fileName: string) {
  return fileName.replace(/\.zip$/i, '').trim() || 'Untitled submission'
}

function fileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`
}

function mergeZipFiles(currentFiles: File[], incomingFiles: File[]) {
  const filesByKey = new Map(currentFiles.map((file) => [fileKey(file), file]))

  for (const file of incomingFiles) {
    filesByKey.set(fileKey(file), file)
  }

  return Array.from(filesByKey.values())
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function jobStatusVariant(status: GradingJobStatus) {
  if (status === 'failed' || status === 'canceled') {
    return 'destructive'
  }

  if (status === 'succeeded') {
    return 'default'
  }

  return 'secondary'
}

function submissionStatusVariant(status: SubmissionStatus) {
  if (status === 'failed') {
    return 'destructive'
  }

  if (status === 'graded') {
    return 'default'
  }

  return 'secondary'
}

function deploymentStatusVariant(status: DeploymentStatus) {
  if (status === 'failed') {
    return 'destructive'
  }

  if (status === 'deployed') {
    return 'default'
  }

  return 'secondary'
}

function getAIButtonState(
  job: GradingJob | null,
  result: SubmissionResult | null
): {
  label: string
  variant: 'default' | 'secondary' | 'outline' | 'destructive'
} {
  if (job?.status === 'queued' || job?.status === 'running') {
    return {
      label: job.progress ? `${job.progress}%` : 'Running',
      variant: 'secondary',
    }
  }

  if (job?.status === 'failed') {
    return {
      label: 'AI failed',
      variant: 'destructive',
    }
  }

  if (result) {
    return {
      label: `AI ${result.score}/${result.maxScore}`,
      variant: 'default',
    }
  }

  return {
    label: 'AI grade',
    variant: 'outline',
  }
}

function buildStatusVariant(status: BuildStatus) {
  if (status === 'failed') {
    return 'destructive'
  }

  if (status === 'passed') {
    return 'default'
  }

  return 'secondary'
}
