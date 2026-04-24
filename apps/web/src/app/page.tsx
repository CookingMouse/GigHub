import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">GigHub</p>
        <h1>Work with Confidence. Get Paid with Escrow.</h1>
        <p className="muted" style={{ fontSize: "1.1rem", maxWidth: "600px" }}>
          The secure marketplace where freelancers and companies build trust through 
          AI-validated milestones and guaranteed payments.
        </p>

        <div className="cta-row">
          <Link className="button-primary" href="/register">
            Create account
          </Link>
          <Link className="button-secondary" href="/login">
            Sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
