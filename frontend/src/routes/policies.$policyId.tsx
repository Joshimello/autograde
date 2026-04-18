import { createFileRoute } from '@tanstack/react-router'
import { PolicyEditor } from './-policy-editor'

export const Route = createFileRoute('/policies/$policyId')({
  component: EditPolicyPage,
})

function EditPolicyPage() {
  const { policyId } = Route.useParams()

  return <PolicyEditor mode="edit" policyId={policyId} />
}
