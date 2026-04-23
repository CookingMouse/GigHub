import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">GigHub</p>
        <h1>Escrow-backed freelance work with AI decision intelligence.</h1>
        <p className="muted">
          GigHub now supports structured briefs, mock GLM validation, funded escrow, milestone
          submissions, disputes, income statements, matching, and admin audit views for the full
          hackathon demo loop.
        </p>

        <div className="cta-row">
          <Link className="button-primary" href="/register">
            Create account
          </Link>
          <Link className="button-secondary" href="/login">
            Sign in
          </Link>
          <Link className="button-secondary" href="/demo">
            Demo readiness
          </Link>
        </div>

        <div className="meta-row">
          <span className="button-secondary">Mock GLM providers active</span>
          <span className="button-secondary">Seeded demo accounts</span>
          <span className="button-secondary">End-to-end marketplace flow</span>
        </div>
      </section>
    </main>
  );
}
