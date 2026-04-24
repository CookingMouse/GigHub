import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="page-shell">
      <section className="shell-card">
        <p className="eyebrow">GigHub</p>
        <h1>Sign in</h1>
        <p className="muted">
          Use your freelancer or company account to enter the platform.
        </p>
        <LoginForm />
        <p className="muted">
          Need an account? <Link href="/register">Register here</Link>.
        </p>
      </section>
    </main>
  );
}

