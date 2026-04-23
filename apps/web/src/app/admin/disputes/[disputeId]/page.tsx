import { AdminDisputeDetailPage } from "@/components/admin-dispute-detail-page";

type AdminDisputeDetailRouteProps = {
  params: Promise<{
    disputeId: string;
  }>;
};

export default async function AdminDisputeDetailRoute({
  params
}: AdminDisputeDetailRouteProps) {
  const { disputeId } = await params;

  return (
    <main className="page-shell">
      <AdminDisputeDetailPage disputeId={disputeId} />
    </main>
  );
}
