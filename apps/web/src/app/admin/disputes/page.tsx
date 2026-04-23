import { ProtectedShell } from "@/components/protected-shell";

export default function AdminDisputesPageRoute() {
  return (
    <main className="page-shell">
      <ProtectedShell mode="admin" />
    </main>
  );
}
