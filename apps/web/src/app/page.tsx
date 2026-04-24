import Link from "next/link";

const ShieldIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const ZapIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export default function HomePage() {
  return (
    <div className="landing-container">
      <header className="landing-header">
        <div className="landing-logo">
          <div className="logo-icon">
            <ShieldIcon size={18} />
          </div>
          <span>GigHub</span>
        </div>
        <Link className="button-secondary sign-in-btn" href="/login">
          Sign In
        </Link>
      </header>

      <main className="landing-hero">
        <div className="hero-content">
          <h1 className="hero-headline">
            <span className="part-black">Secure Work.</span>{" "}
            <span className="part-green">Guaranteed Pay.</span>
          </h1>
          <p className="hero-sentence">
            Malaysia's first escrow-backed marketplace protecting freelancers 
            and companies through AI-validated milestones.
          </p>
          <Link className="button-primary create-account-btn" href="/register">
            Create Account
          </Link>
        </div>
      </main>

      <section className="landing-advantages-small">
        <div className="advantage-card-small">
          <div className="advantage-icon-small"><ShieldIcon size={18} /></div>
          <h3>Escrow Protection</h3>
          <p>Payments secured until work is approved.</p>
        </div>
        <div className="advantage-card-small">
          <div className="advantage-icon-small"><ZapIcon /></div>
          <h3>AI Validation</h3>
          <p>Clear briefs and smart milestone tracking.</p>
        </div>
        <div className="advantage-card-small">
          <div className="advantage-icon-small"><CheckIcon /></div>
          <h3>Formal Income</h3>
          <p>Verified statements for financial records.</p>
        </div>
      </section>
    </div>
  );
}
