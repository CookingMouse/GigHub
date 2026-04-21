import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">GigHub</p>
        <h1>Phase 0 and Phase 1 are the trust foundation.</h1>
        <p className="muted">
          This branch establishes the monorepo, local infrastructure, JWT session handling, and
          role-based auth for freelancer, company, and seeded admin accounts.
        </p>

        <div className="cta-row">
          <Link className="button-primary" href="/register">
            Create account
          </Link>
          <Link className="button-secondary" href="/login">
            Sign in
          </Link>
        </div>

        <div className="meta-row">
          <span className="button-secondary">Freelancer + company self-registration</span>
          <span className="button-secondary">Admin seeded from Prisma</span>
          <span className="button-secondary">Protected dashboards live</span>
        </div>
      </section>
    </main>
  );
}

