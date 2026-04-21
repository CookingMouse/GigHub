import { ProtectedShell } from "@/components/protected-shell";

export default function DashboardPage() {
  return (
    <main className="page-shell">
      <ProtectedShell mode="dashboard" />
    </main>
  );
}

