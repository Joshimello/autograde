import { createFileRoute } from '@tanstack/react-router'
import { PolicyEditor } from './-policy-editor'

export const Route = createFileRoute('/policies/new')({
  component: NewPolicyPage,
})

function NewPolicyPage() {
  return <PolicyEditor mode="create" />
}
