import Link from "next/link";
import { RegisterForm } from "@/components/register-form";

export default function RegisterPage() {
  return (
    <main className="page-shell">
      <section className="shell-card">
        <p className="eyebrow">GigHub</p>
        <h1>Create your account</h1>
        <p className="muted">
          Freelancer and company registration is open in Phase 1.
        </p>
        <RegisterForm />
        <p className="muted">
          Already have an account? <Link href="/login">Sign in</Link>.
        </p>
      </section>
    </main>
  );
}

