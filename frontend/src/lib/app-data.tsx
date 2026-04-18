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

export type SubmissionStatus = 'pending' | 'grading' | 'graded' | 'failed'

export type CriterionGrade = {
  criterionId: string
  score: number
  feedback: string
}

export type Submission = {
  id: string
  label: string
  policyId: string
  fileName: string
  status: SubmissionStatus
  grades: CriterionGrade[]
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
  addSubmission: (submission: NewSubmission) => Promise<void>
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
  return {
    id: record.id,
    label: record.label ?? 'Untitled submission',
    policyId: record.policy ?? '',
    fileName: record.archive ?? '',
    status: record.status ?? 'pending',
    grades: toGrades(record.manualGrades),
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

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() =>
    mapUser(pb.authStore.record)
  )
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState('')
  const [policies, setPolicies] = useState<Policy[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const authenticated = Boolean(user && pb.authStore.isValid)

  const clearData = useCallback(() => {
    setPolicies([])
    setSubmissions([])
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
      const [policyRecords, submissionRecords] = await Promise.all([
        pb.collection(Collections.Policies).getFullList(),
        pb.collection(Collections.Submissions).getFullList(),
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
      deleteSubmission: async (submissionId) => {
        await pb.collection(Collections.Submissions).delete(submissionId)
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
    }),
    [
      authError,
      authLoading,
      authenticated,
      clearData,
      error,
      loading,
      policies,
      refresh,
      refreshWhitelist,
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
