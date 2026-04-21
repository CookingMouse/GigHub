import { ProtectedShell } from "@/components/protected-shell";

export default function AdminPage() {
  return (
    <main className="page-shell">
      <ProtectedShell mode="admin" />
    </main>
  );
}

