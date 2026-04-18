import { type FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Separator } from '#/components/ui/separator'
import { Textarea } from '#/components/ui/textarea'
import { type Policy, useAppData } from '#/lib/mock-data'

type PolicyEditorProps =
  | {
      mode: 'create'
      policyId?: never
    }
  | {
      mode: 'edit'
      policyId: string
    }

type CriterionDraft = {
  id: string
  label: string
  points: string
  description: string
}

function createCriterionDraft(): CriterionDraft {
  return {
    id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: '',
    points: '',
    description: '',
  }
}

function toCriterionDrafts(policy?: Policy): CriterionDraft[] {
  if (!policy) {
    return [createCriterionDraft()]
  }

  return policy.criteria.map((criterion) => ({
    id: criterion.id,
    label: criterion.label,
    points: String(criterion.points),
    description: criterion.description,
  }))
}

export function PolicyEditor(props: PolicyEditorProps) {
  const navigate = useNavigate()
  const { policies, addPolicy, updatePolicy } = useAppData()
  const policy =
    props.mode === 'edit'
      ? policies.find((item) => item.id === props.policyId)
      : undefined

  const initialCriteria = useMemo(() => toCriterionDrafts(policy), [policy])
  const [name, setName] = useState(policy?.name ?? '')
  const [description, setDescription] = useState(policy?.description ?? '')
  const [criteria, setCriteria] = useState<CriterionDraft[]>(initialCriteria)

  const validCriteria = criteria.filter(
    (criterion) =>
      criterion.label.trim().length > 0 && Number(criterion.points) > 0
  )
  const canSave = name.trim().length > 0 && validCriteria.length > 0

  function updateCriterion(
    criterionId: string,
    field: keyof Omit<CriterionDraft, 'id'>,
    value: string
  ) {
    setCriteria((current) =>
      current.map((criterion) =>
        criterion.id === criterionId ? { ...criterion, [field]: value } : criterion
      )
    )
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canSave) {
      return
    }

    const nextPolicy = {
      name: name.trim(),
      description: description.trim(),
      criteria: validCriteria.map((criterion) => ({
        id: criterion.id,
        label: criterion.label.trim(),
        points: Number(criterion.points),
        description: criterion.description.trim(),
      })),
    }

    if (props.mode === 'create') {
      addPolicy(nextPolicy)
    } else {
      updatePolicy(props.policyId, nextPolicy)
    }

    navigate({ to: '/policies' })
  }

  if (props.mode === 'edit' && !policy) {
    return (
      <main className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-8">
        <Button asChild variant="ghost" className="w-fit">
          <Link to="/policies">
            <ArrowLeft />
            Back to policies
          </Link>
        </Button>
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Policy not found.
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-8">
      <Button asChild variant="ghost" className="w-fit">
        <Link to="/policies">
          <ArrowLeft />
          Back to policies
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>
            {props.mode === 'create' ? 'Create policy' : 'Edit policy'}
          </CardTitle>
          <CardDescription>
            Manage the policy details and rubric criteria on this page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-5" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="policy-name">Policy name</Label>
              <Input
                id="policy-name"
                value={name}
                placeholder="Final project rubric"
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="policy-description">Description</Label>
              <Textarea
                id="policy-description"
                value={description}
                placeholder="What this policy evaluates"
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>

            <Separator />

            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <Label>Rubric criteria</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCriteria((current) => [
                      ...current,
                      createCriterionDraft(),
                    ])
                  }
                >
                  <Plus />
                  Add criterion
                </Button>
              </div>

              {criteria.map((criterion, index) => (
                <div key={criterion.id} className="grid gap-3 rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">Criterion {index + 1}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove criterion ${index + 1}`}
                      disabled={criteria.length === 1}
                      onClick={() =>
                        setCriteria((current) =>
                          current.filter((item) => item.id !== criterion.id)
                        )
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[1fr_96px]">
                    <div className="grid gap-2">
                      <Label htmlFor={`${criterion.id}-label`}>Label</Label>
                      <Input
                        id={`${criterion.id}-label`}
                        value={criterion.label}
                        placeholder="Correctness"
                        onChange={(event) =>
                          updateCriterion(
                            criterion.id,
                            'label',
                            event.target.value
                          )
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`${criterion.id}-points`}>Points</Label>
                      <Input
                        id={`${criterion.id}-points`}
                        type="number"
                        min="1"
                        value={criterion.points}
                        onChange={(event) =>
                          updateCriterion(
                            criterion.id,
                            'points',
                            event.target.value
                          )
                        }
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`${criterion.id}-description`}>
                      Description
                    </Label>
                    <Textarea
                      id={`${criterion.id}-description`}
                      value={criterion.description}
                      placeholder="What the grader should look for"
                      onChange={(event) =>
                        updateCriterion(
                          criterion.id,
                          'description',
                          event.target.value
                        )
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <Button asChild type="button" variant="outline">
                <Link to="/policies">Cancel</Link>
              </Button>
              <Button type="submit" disabled={!canSave}>
                {props.mode === 'create' ? 'Create policy' : 'Save policy'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
