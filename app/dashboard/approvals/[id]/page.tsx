import { redirect } from 'next/navigation';

export default function ApprovalDetailRedirect({ params }: { params: { id: string } }) {
  // Permanently redirect any legacy approvals detail route to the unified request detail page
  redirect(`/dashboard/requests/${params.id}`);
}
