import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react'

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

export type SubmissionStatus = 'Pending' | 'Ready' | 'Reviewing'

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

type NewPolicy = Omit<Policy, 'id'>
type NewSubmission = Omit<Submission, 'id' | 'status'>

type AppDataContextValue = {
  policies: Policy[]
  submissions: Submission[]
  addPolicy: (policy: NewPolicy) => Policy
  updatePolicy: (policyId: string, policy: NewPolicy) => void
  deletePolicy: (policyId: string) => boolean
  addSubmission: (submission: NewSubmission) => void
  deleteSubmission: (submissionId: string) => void
  saveSubmissionGrades: (
    submissionId: string,
    grades: CriterionGrade[]
  ) => void
  getPolicyName: (policyId: string) => string
  getPolicyTotalPoints: (policy: Policy) => number
  getSubmissionScore: (submission: Submission) => number
}

const initialPolicies: Policy[] = [
  {
    id: 'policy-react-ui',
    name: 'React UI Rubric',
    description: 'Checks component structure, state handling, and user experience.',
    criteria: [
      {
        id: 'criterion-components',
        label: 'Component structure',
        points: 30,
        description: 'Uses clear component boundaries and reusable UI patterns.',
      },
      {
        id: 'criterion-state',
        label: 'State handling',
        points: 25,
        description: 'Handles form and page state predictably.',
      },
      {
        id: 'criterion-ux',
        label: 'User experience',
        points: 20,
        description: 'Provides accessible controls and clear feedback.',
      },
    ],
  },
  {
    id: 'policy-api-basics',
    name: 'API Basics Rubric',
    description: 'Evaluates endpoint design, validation, and error handling.',
    criteria: [
      {
        id: 'criterion-routing',
        label: 'Routing',
        points: 30,
        description: 'Implements the required API routes with clear responses.',
      },
      {
        id: 'criterion-validation',
        label: 'Validation',
        points: 25,
        description: 'Validates request input and handles invalid payloads.',
      },
    ],
  },
]

const initialSubmissions: Submission[] = [
  {
    id: 'submission-dashboard',
    label: 'Team Alpha Dashboard',
    policyId: 'policy-react-ui',
    fileName: 'team-alpha-dashboard.zip',
    status: 'Pending',
    grades: [],
  },
  {
    id: 'submission-api',
    label: 'Section B API Project',
    policyId: 'policy-api-basics',
    fileName: 'section-b-api.zip',
    status: 'Ready',
    grades: [
      {
        criterionId: 'criterion-routing',
        score: 24,
        feedback: 'Core routes are present and return predictable responses.',
      },
      {
        criterionId: 'criterion-validation',
        score: 18,
        feedback: 'Validation exists but some edge cases need clearer messages.',
      },
    ],
  },
]

const AppDataContext = createContext<AppDataContextValue | null>(null)

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [policies, setPolicies] = useState<Policy[]>(initialPolicies)
  const [submissions, setSubmissions] =
    useState<Submission[]>(initialSubmissions)

  const value = useMemo<AppDataContextValue>(
    () => ({
      policies,
      submissions,
      addPolicy: (policy) => {
        const newPolicy = {
          ...policy,
          id: createId('policy'),
          criteria: policy.criteria.map((criterion) => ({
            ...criterion,
            id: createId('criterion'),
          })),
        }

        setPolicies((current) => [
          ...current,
          newPolicy,
        ])

        return newPolicy
      },
      updatePolicy: (policyId, policy) => {
        setPolicies((current) =>
          current.map((item) =>
            item.id === policyId
              ? {
                  ...item,
                  ...policy,
                  criteria: policy.criteria.map((criterion) => ({
                    ...criterion,
                    id: criterion.id || createId('criterion'),
                  })),
                }
              : item
          )
        )
      },
      deletePolicy: (policyId) => {
        if (submissions.some((submission) => submission.policyId === policyId)) {
          return false
        }

        setPolicies((current) =>
          current.filter((policy) => policy.id !== policyId)
        )
        return true
      },
      addSubmission: (submission) => {
        setSubmissions((current) => [
          {
            ...submission,
            id: createId('submission'),
            status: 'Pending',
            grades: [],
          },
          ...current,
        ])
      },
      deleteSubmission: (submissionId) => {
        setSubmissions((current) =>
          current.filter((submission) => submission.id !== submissionId)
        )
      },
      saveSubmissionGrades: (submissionId, grades) => {
        setSubmissions((current) =>
          current.map((submission) =>
            submission.id === submissionId
              ? {
                  ...submission,
                  grades,
                  status: grades.length > 0 ? 'Reviewing' : submission.status,
                }
              : submission
          )
        )
      },
      getPolicyName: (policyId) =>
        policies.find((policy) => policy.id === policyId)?.name ??
        'Unknown policy',
      getPolicyTotalPoints: (policy) =>
        policy.criteria.reduce((total, criterion) => total + criterion.points, 0),
      getSubmissionScore: (submission) =>
        submission.grades.reduce((total, grade) => total + grade.score, 0),
    }),
    [policies, submissions]
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
