import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import PocketBase from 'pocketbase'
import { Collections, type TypedPocketBase } from './pocketbase-types'

const pocketBaseUrl =
  import.meta.env.VITE_POCKETBASE_URL ?? 'http://127.0.0.1:8090'

const pb = new PocketBase(pocketBaseUrl) as TypedPocketBase
pb.autoCancellation(false)
const whitelistCollection = 'email_whitelist'

export type RubricCriterion = {
  id: string
  label: string
  points: number
  description: string
}

export type Policy = {
  id: string
  name: string
  description: string
  criteria: RubricCriterion[]
}

export type SubmissionStatus =
  | 'pending'
  | 'grading'
  | 'needs_review'
  | 'graded'
  | 'failed'

export type CriterionGrade = {
  criterionId: string
  label?: string
  maxScore?: number
  score: number
  feedback: string
}

export type Submission = {
  id: string
  label: string
  policyId: string
  fileName: string
  fileUrl: string
  status: SubmissionStatus
  grades: CriterionGrade[]
}

export type GradingJobStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'canceled'

export type GradingJob = {
  id: string
  submissionId: string
  status: GradingJobStatus
  progress: number
  message: string
  error: string
  startedAt: string
}

export type JobLogStream = 'stdout' | 'stderr' | 'system'

export type JobLog = {
  id: string
  jobId: string
  sequence: number
  stream: JobLogStream
  message: string
}

export type BuildStatus = 'passed' | 'failed' | 'skipped'

export type SubmissionResult = {
  id: string
  submissionId: string
  created: string
  score: number
  maxScore: number
  buildStatus: BuildStatus | ''
  buildLogSummary: string
  feedback: string
  rubricResults: CriterionGrade[]
}

export type DeploymentStatus = 'queued' | 'building' | 'deployed' | 'failed'

export type Deployment = {
  id: string
  submissionId: string
  jobId: string
  created: string
  status: DeploymentStatus
  url: string
  message: string
  error: string
  deployId: string
  deployedAt: string
}

export type PolicyImportStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'canceled'

export type PolicyImport = {
  id: string
  label: string
  fileName: string
  status: PolicyImportStatus
  progress: number
  message: string
  policyId: string
}

export type AuthUser = {
  id: string
  email: string
  name: string
  allowed: boolean
}

export type WhitelistEntry = {
  id: string
  email: string
  active: boolean
  notes: string
}

type PolicyRecord = {
  id: string
  name?: string
  description?: string
  criteria?: unknown
}

type SubmissionRecord = {
  id: string
  created?: string
  label?: string
  policy?: string
  archive?: string
  status?: SubmissionStatus
  manualGrades?: unknown
}

type GradingJobRecord = {
  id: string
  created?: string
  type?: string
  submission?: string
  status?: GradingJobStatus
  progress?: number
  message?: string
  error?: string
  startedAt?: string
}

type JobLogRecord = {
  id: string
  created?: string
  job?: string
  sequence?: number
  stream?: JobLogStream
  message?: string
}

type ResultRecord = {
  id: string
  created?: string
  submission?: string
  score?: number
  maxScore?: number
  buildStatus?: BuildStatus
  buildLogSummary?: string
  feedback?: string
  rubricResults?: unknown
}

type DeploymentRecord = {
  id: string
  created?: string
  submission?: string
  job?: string
  status?: DeploymentStatus
  url?: string
  message?: string
  error?: string
  deployId?: string
  deployedAt?: string
}

type PolicyImportRecord = {
  id: string
  created?: string
  label?: string
  sourceFile?: string
  status?: PolicyImportStatus
  progress?: number
  message?: string
  policy?: string
}

type AuthRecord = {
  id?: string
  email?: string
  name?: string
  allowed?: boolean
}

type WhitelistRecord = {
  id: string
  email?: string
  active?: boolean
  notes?: string
}

type NewPolicy = Omit<Policy, 'id'>
type NewSubmission = {
  label: string
  policyId: string
  archive: File
}
type SubmissionUpdate = {
  label: string
  policyId: string
}
type NewPolicyImport = {
  label: string
  sourceFile: File
}
type NewWhitelistEntry = {
  email: string
  notes?: string
}

type AppDataContextValue = {
  user: AuthUser | null
  authenticated: boolean
  authLoading: boolean
  policies: Policy[]
  submissions: Submission[]
  jobs: GradingJob[]
  jobLogs: JobLog[]
  results: SubmissionResult[]
  deployments: Deployment[]
  policyImports: PolicyImport[]
  whitelist: WhitelistEntry[]
  loading: boolean
  error: string
  authError: string
  loginWithOAuth: () => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
  refreshWhitelist: () => Promise<void>
  addPolicy: (policy: NewPolicy) => Promise<Policy>
  updatePolicy: (policyId: string, policy: NewPolicy) => Promise<void>
  deletePolicy: (policyId: string) => Promise<boolean>
  importPolicyDocument: (policyImport: NewPolicyImport) => Promise<void>
  addSubmission: (submission: NewSubmission) => Promise<void>
  updateSubmission: (
    submissionId: string,
    submission: SubmissionUpdate
  ) => Promise<void>
  startSubmissionGrading: (submissionId: string) => Promise<void>
  cancelSubmissionGrading: (jobId: string) => Promise<void>
  deleteSubmission: (submissionId: string) => Promise<void>
  saveSubmissionGrades: (
    submissionId: string,
    grades: CriterionGrade[]
  ) => Promise<void>
  addWhitelistEntry: (entry: NewWhitelistEntry) => Promise<void>
  updateWhitelistEntry: (
    entryId: string,
    update: Partial<Pick<WhitelistEntry, 'active' | 'notes'>>
  ) => Promise<void>
  deleteWhitelistEntry: (entryId: string) => Promise<void>
  getPolicyName: (policyId: string) => string
  getPolicyTotalPoints: (policy: Policy) => number
  getSubmissionScore: (submission: Submission) => number
  getSubmissionJob: (submissionId: string) => GradingJob | null
  getSubmissionResult: (submissionId: string) => SubmissionResult | null
  getSubmissionDeployment: (submissionId: string) => Deployment | null
  getJobLogs: (jobId: string) => JobLog[]
  retrySubmissionDeployment: (submissionId: string) => Promise<void>
}

const AppDataContext = createContext<AppDataContextValue | null>(null)

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function toCriteria(value: unknown): RubricCriterion[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null
      }

      const candidate = item as Partial<RubricCriterion>
      const label = String(candidate.label ?? '').trim()

      if (!label) {
        return null
      }

      return {
        id: candidate.id || createId('criterion'),
        label,
        points: Number(candidate.points) || 0,
        description: String(candidate.description ?? ''),
      }
    })
    .filter((criterion): criterion is RubricCriterion => Boolean(criterion))
}

function toGrades(value: unknown): CriterionGrade[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null
      }

      const candidate = item as Partial<CriterionGrade>
      const criterionId = String(candidate.criterionId ?? '').trim()

      if (!criterionId) {
        return null
      }

      return {
        criterionId,
        label: candidate.label ? String(candidate.label) : undefined,
        maxScore:
          typeof candidate.maxScore === 'number'
            ? candidate.maxScore
            : undefined,
        score: Number(candidate.score) || 0,
        feedback: String(candidate.feedback ?? ''),
      }
    })
    .filter((grade): grade is CriterionGrade => Boolean(grade))
}

function mapPolicy(record: PolicyRecord): Policy {
  return {
    id: record.id,
    name: record.name ?? 'Untitled policy',
    description: record.description ?? '',
    criteria: toCriteria(record.criteria),
  }
}

function mapSubmission(record: SubmissionRecord): Submission {
  const fileName = record.archive ?? ''

  return {
    id: record.id,
    label: record.label ?? 'Untitled submission',
    policyId: record.policy ?? '',
    fileName,
    fileUrl: fileName ? pb.files.getURL(record, fileName) : '',
    status: record.status ?? 'pending',
    grades: toGrades(record.manualGrades),
  }
}

function mapJob(record: GradingJobRecord): GradingJob {
  return {
    id: record.id,
    submissionId: record.submission ?? '',
    created: record.created ?? '',
    status: record.status ?? 'queued',
    progress: record.progress ?? 0,
    message: record.message ?? '',
    error: record.error ?? '',
    startedAt: record.startedAt ?? '',
  }
}

function mapJobLog(record: JobLogRecord): JobLog {
  return {
    id: record.id,
    jobId: record.job ?? '',
    sequence: record.sequence ?? 0,
    stream: record.stream ?? 'stdout',
    message: record.message ?? '',
  }
}

function mapResult(record: ResultRecord): SubmissionResult {
  return {
    id: record.id,
    created: record.created ?? '',
    submissionId: record.submission ?? '',
    score: record.score ?? 0,
    maxScore: record.maxScore ?? 0,
    buildStatus: record.buildStatus ?? '',
    buildLogSummary: record.buildLogSummary ?? '',
    feedback: record.feedback ?? '',
    rubricResults: toGrades(record.rubricResults),
  }
}

function mapDeployment(record: DeploymentRecord): Deployment {
  return {
    id: record.id,
    submissionId: record.submission ?? '',
    jobId: record.job ?? '',
    created: record.created ?? '',
    status: record.status ?? 'queued',
    url: record.url ?? '',
    message: record.message ?? '',
    error: record.error ?? '',
    deployId: record.deployId ?? '',
    deployedAt: record.deployedAt ?? '',
  }
}

function mapPolicyImport(record: PolicyImportRecord): PolicyImport {
  return {
    id: record.id,
    label: record.label ?? 'Untitled import',
    fileName: record.sourceFile ?? '',
    status: record.status ?? 'queued',
    progress: record.progress ?? 0,
    message: record.message ?? '',
    policyId: record.policy ?? '',
  }
}

function mapUser(record: unknown): AuthUser | null {
  if (!record || typeof record !== 'object') {
    return null
  }

  const candidate = record as AuthRecord

  if (!candidate.id || !candidate.email) {
    return null
  }

  return {
    id: candidate.id,
    email: candidate.email,
    name: candidate.name ?? '',
    allowed: candidate.allowed === true,
  }
}

function mapWhitelistEntry(record: WhitelistRecord): WhitelistEntry {
  return {
    id: record.id,
    email: record.email ?? '',
    active: record.active === true,
    notes: record.notes ?? '',
  }
}

function sortJobLogs(logs: JobLog[]) {
  return logs.toSorted((first, second) => {
    if (first.jobId !== second.jobId) {
      return first.jobId.localeCompare(second.jobId)
    }

    return first.sequence - second.sequence
  })
}

function getLatestSubmissionJob(jobs: GradingJob[], submissionId: string) {
  const relatedJobs = jobs.filter((job) => job.submissionId === submissionId)

  if (relatedJobs.length === 0) {
    return null
  }

  const activeJob = relatedJobs.find(
    (job) => job.status === 'queued' || job.status === 'running'
  )

  if (activeJob) {
    return activeJob
  }

  return relatedJobs.toSorted((first, second) =>
    second.startedAt.localeCompare(first.startedAt)
  )[0]
}

function getLatestSubmissionResult(
  results: SubmissionResult[],
  submissionId: string
) {
  return (
    results
      .filter((result) => result.submissionId === submissionId)
      .toSorted((first, second) => second.created.localeCompare(first.created))[0] ??
    null
  )
}

function getLatestSubmissionDeployment(
  deployments: Deployment[],
  submissionId: string
) {
  const relatedDeployments = deployments.filter(
    (deployment) => deployment.submissionId === submissionId
  )

  if (relatedDeployments.length === 0) {
    return null
  }

  const activeDeployment = relatedDeployments.find(
    (deployment) =>
      deployment.status === 'queued' || deployment.status === 'building'
  )

  if (activeDeployment) {
    return activeDeployment
  }

  return relatedDeployments.toSorted((first, second) =>
    second.created.localeCompare(first.created)
  )[0]
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState('')
  const [policies, setPolicies] = useState<Policy[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [jobs, setJobs] = useState<GradingJob[]>([])
  const [jobLogs, setJobLogs] = useState<JobLog[]>([])
  const [results, setResults] = useState<SubmissionResult[]>([])
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [policyImports, setPolicyImports] = useState<PolicyImport[]>([])
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const authenticated = Boolean(user && pb.authStore.isValid)

  const clearData = useCallback(() => {
    setPolicies([])
    setSubmissions([])
    setJobs([])
    setJobLogs([])
    setResults([])
    setDeployments([])
    setPolicyImports([])
    setWhitelist([])
  }, [])

  const refresh = useCallback(async () => {
    if (!pb.authStore.isValid) {
      clearData()
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const [
        policyRecords,
        submissionRecords,
        jobRecords,
        jobLogRecords,
        resultRecords,
        deploymentRecords,
        policyImportRecords,
      ] = await Promise.all([
          pb.collection(Collections.Policies).getFullList(),
          pb.collection(Collections.Submissions).getFullList(),
          pb.collection(Collections.Jobs).getFullList({
            filter: 'type = "grading"',
          }),
          pb.collection(Collections.JobLogs).getFullList(),
          pb.collection(Collections.Results).getFullList(),
          (pb as PocketBase).collection(Collections.Deployments).getFullList(),
          pb.collection(Collections.PolicyImports).getFullList(),
        ])

      setPolicies(
        (policyRecords as PolicyRecord[])
          .map(mapPolicy)
          .sort((first, second) => first.name.localeCompare(second.name))
      )
      setSubmissions(
        (submissionRecords as SubmissionRecord[])
          .toSorted((first, second) =>
            String(second.created ?? '').localeCompare(String(first.created ?? ''))
          )
          .map(mapSubmission)
      )
      setJobs(
        (jobRecords as GradingJobRecord[])
          .toSorted((first, second) =>
            String(second.created ?? '').localeCompare(String(first.created ?? ''))
          )
          .map(mapJob)
      )
      setJobLogs(sortJobLogs((jobLogRecords as JobLogRecord[]).map(mapJobLog)))
      setResults(
        (resultRecords as ResultRecord[])
          .toSorted((first, second) =>
            String(second.created ?? '').localeCompare(String(first.created ?? ''))
          )
          .map(mapResult)
      )
      setDeployments(
        (deploymentRecords as DeploymentRecord[])
          .toSorted((first, second) =>
            String(second.created ?? '').localeCompare(String(first.created ?? ''))
          )
          .map(mapDeployment)
      )
      setPolicyImports(
        (policyImportRecords as PolicyImportRecord[])
          .toSorted((first, second) =>
            String(second.created ?? '').localeCompare(String(first.created ?? ''))
          )
          .map(mapPolicyImport)
      )
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to load PocketBase records.'
      )
    } finally {
      setLoading(false)
    }
  }, [clearData])

  useEffect(() => {
    if (!authenticated) {
      return
    }

    let active = true
    const unsubscribers: Array<() => void> = []

    void Promise.all([
      pb.collection(Collections.Jobs).subscribe('*', (event) => {
        const record = event.record as GradingJobRecord

        if (record.type && record.type !== 'grading') {
          return
        }

        if (event.action === 'delete') {
          setJobs((current) => current.filter((job) => job.id !== record.id))
          return
        }

        const nextJob = mapJob(record)
        setJobs((current) => {
          const withoutJob = current.filter((job) => job.id !== nextJob.id)
          return [nextJob, ...withoutJob]
        })
      }),
      pb.collection(Collections.JobLogs).subscribe('*', (event) => {
        const record = event.record as JobLogRecord

        if (event.action === 'delete') {
          setJobLogs((current) => current.filter((log) => log.id !== record.id))
          return
        }

        const nextLog = mapJobLog(record)
        setJobLogs((current) =>
          sortJobLogs([
            ...current.filter((log) => log.id !== nextLog.id),
            nextLog,
          ])
        )
      }),
      pb.collection(Collections.Submissions).subscribe('*', () => {
        void refresh()
      }),
      pb.collection(Collections.Results).subscribe('*', () => {
        void refresh()
      }),
      (pb as PocketBase).collection(Collections.Deployments).subscribe('*', (event) => {
        const record = event.record as DeploymentRecord

        if (event.action === 'delete') {
          setDeployments((current) =>
            current.filter((deployment) => deployment.id !== record.id)
          )
          return
        }

        const nextDeployment = mapDeployment(record)
        setDeployments((current) => {
          const withoutDeployment = current.filter(
            (deployment) => deployment.id !== nextDeployment.id
          )
          return [nextDeployment, ...withoutDeployment]
        })
      }),
    ])
      .then((handlers) => {
        if (!active) {
          handlers.forEach((unsubscribe) => unsubscribe())
          return
        }

        unsubscribers.push(...handlers)
      })
      .catch((cause) => {
        console.error('Realtime subscription failed', cause)
      })

    return () => {
      active = false
      unsubscribers.forEach((unsubscribe) => unsubscribe())
    }
  }, [authenticated, refresh])

  const refreshWhitelist = useCallback(async () => {
    if (!pb.authStore.isValid) {
      setWhitelist([])
      return
    }

    const records = await (pb as PocketBase)
      .collection(whitelistCollection)
      .getFullList()

    setWhitelist(
      (records as WhitelistRecord[])
        .map(mapWhitelistEntry)
        .sort((first, second) => first.email.localeCompare(second.email))
    )
  }, [])

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange((_token, record) => {
      setUser(mapUser(record))
      setAuthLoading(false)
    }, true)

    if (pb.authStore.isValid) {
      pb.collection(Collections.Users)
        .authRefresh()
        .catch(() => {
          pb.authStore.clear()
          clearData()
        })
        .finally(() => setAuthLoading(false))
    } else {
      setAuthLoading(false)
    }

    return unsubscribe
  }, [clearData])

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (authenticated) {
      void refresh()
      void refreshWhitelist()
    } else {
      clearData()
      setLoading(false)
    }
  }, [authLoading, authenticated, clearData, refresh, refreshWhitelist])

  const value = useMemo<AppDataContextValue>(
    () => ({
      user,
      authenticated,
      authLoading,
      policies,
      submissions,
      jobs,
      jobLogs,
      results,
      deployments,
      policyImports,
      whitelist,
      loading,
      error,
      authError,
      loginWithOAuth: async () => {
        setAuthError('')
        try {
          await pb.collection(Collections.Users).authWithOAuth2({
            provider: 'github',
          })
          await Promise.all([refresh(), refreshWhitelist()])
        } catch (cause) {
          setAuthError(
            cause instanceof Error
              ? cause.message
              : 'Unable to start GitHub login.'
          )
        }
      },
      logout: () => {
        pb.authStore.clear()
        setUser(null)
        clearData()
      },
      refresh,
      refreshWhitelist,
      addPolicy: async (policy) => {
        const record = await pb.collection(Collections.Policies).create({
          name: policy.name,
          description: policy.description,
          criteria: policy.criteria,
          active: true,
        })
        await refresh()
        return mapPolicy(record as PolicyRecord)
      },
      updatePolicy: async (policyId, policy) => {
        await pb.collection(Collections.Policies).update(policyId, {
          name: policy.name,
          description: policy.description,
          criteria: policy.criteria,
          active: true,
        })
        await refresh()
      },
      deletePolicy: async (policyId) => {
        if (submissions.some((submission) => submission.policyId === policyId)) {
          return false
        }

        await pb.collection(Collections.Policies).delete(policyId)
        await refresh()
        return true
      },
      importPolicyDocument: async (policyImport) => {
        await pb.collection(Collections.PolicyImports).create({
          label: policyImport.label,
          sourceFile: policyImport.sourceFile,
          status: 'queued',
          progress: 0,
          message: 'Queued',
        })
        await refresh()
      },
      addSubmission: async (submission) => {
        await pb.collection(Collections.Submissions).create({
          label: submission.label,
          policy: submission.policyId,
          archive: submission.archive,
          status: 'pending',
          manualGrades: [],
          manualScore: 0,
        })
        await refresh()
      },
      updateSubmission: async (submissionId, submission) => {
        await pb.collection(Collections.Submissions).update(submissionId, {
          label: submission.label,
          policy: submission.policyId,
        })
        await refresh()
      },
      startSubmissionGrading: async (submissionId) => {
        await pb.collection(Collections.Jobs).create({
          submission: submissionId,
          type: 'grading',
          status: 'queued',
          progress: 0,
          message: 'Queued',
        })
        await pb.collection(Collections.Submissions).update(submissionId, {
          status: 'grading',
        })
        await refresh()
      },
      cancelSubmissionGrading: async (jobId) => {
        await pb.collection(Collections.Jobs).update(jobId, {
          status: 'canceled',
          message: 'Cancel requested',
        })
        await refresh()
      },
      deleteSubmission: async (submissionId) => {
        await pb.collection(Collections.Submissions).delete(submissionId)
        await refresh()
      },
      retrySubmissionDeployment: async (submissionId) => {
        const existingDeployment = getLatestSubmissionDeployment(
          deployments,
          submissionId
        )

        if (
          existingDeployment &&
          (existingDeployment.status === 'queued' ||
            existingDeployment.status === 'building')
        ) {
          throw new Error('A preview deployment is already in progress.')
        }

        const job = await (pb as PocketBase).collection(Collections.Jobs).create({
          submission: submissionId,
          type: 'deployment',
          status: 'queued',
          progress: 0,
          message: 'Queued',
        })

        try {
          await (pb as PocketBase).collection(Collections.Deployments).create({
            submission: submissionId,
            job: job.id,
            status: 'queued',
            url: '',
            message: 'Queued',
            error: '',
            deployId: '',
          })
        } catch (cause) {
          await (pb as PocketBase)
            .collection(Collections.Jobs)
            .delete(job.id)
            .catch(() => undefined)
          throw cause
        }

        await refresh()
      },
      saveSubmissionGrades: async (submissionId, grades) => {
        await pb.collection(Collections.Submissions).update(submissionId, {
          manualGrades: grades,
          manualScore: grades.reduce((total, grade) => total + grade.score, 0),
          status: 'graded',
        })
        await refresh()
      },
      addWhitelistEntry: async (entry) => {
        await (pb as PocketBase).collection(whitelistCollection).create({
          email: normalizeEmail(entry.email),
          notes: entry.notes?.trim() ?? '',
          active: true,
        })
        await refreshWhitelist()
      },
      updateWhitelistEntry: async (entryId, update) => {
        await (pb as PocketBase)
          .collection(whitelistCollection)
          .update(entryId, update)
        await refreshWhitelist()
      },
      deleteWhitelistEntry: async (entryId) => {
        await (pb as PocketBase).collection(whitelistCollection).delete(entryId)
        await refreshWhitelist()
      },
      getPolicyName: (policyId) =>
        policies.find((policy) => policy.id === policyId)?.name ??
        'Unknown policy',
      getPolicyTotalPoints: (policy) =>
        policy.criteria.reduce((total, criterion) => total + criterion.points, 0),
      getSubmissionScore: (submission) =>
        submission.grades.reduce((total, grade) => total + grade.score, 0),
      getSubmissionJob: (submissionId) =>
        getLatestSubmissionJob(jobs, submissionId),
      getSubmissionResult: (submissionId) =>
        getLatestSubmissionResult(results, submissionId),
      getSubmissionDeployment: (submissionId) =>
        getLatestSubmissionDeployment(deployments, submissionId),
      getJobLogs: (jobId) => jobLogs.filter((log) => log.jobId === jobId),
    }),
    [
      authError,
      authLoading,
      authenticated,
      clearData,
      error,
      loading,
      jobs,
      jobLogs,
      policies,
      policyImports,
      deployments,
      refresh,
      refreshWhitelist,
      results,
      submissions,
      user,
      whitelist,
    ]
  )

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  )
}

export function useAppData() {
  const context = useContext(AppDataContext)

  if (!context) {
    throw new Error('useAppData must be used inside AppDataProvider')
  }

  return context
}
