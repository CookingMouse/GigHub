import { AdminJobTracePage } from "@/components/admin-job-trace-page";

type AdminJobTraceRouteProps = {
  params: Promise<{
    jobId: string;
  }>;
};

export default async function AdminJobTraceRoute({ params }: AdminJobTraceRouteProps) {
  const { jobId } = await params;

  return (
    <main className="page-shell">
      <AdminJobTracePage jobId={jobId} />
    </main>
  );
}
