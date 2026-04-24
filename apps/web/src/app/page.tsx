import Link from "next/link";

const CheckIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const ZapIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

export default function HomePage() {
  return (
    <div className="landing-container">
      <header className="landing-header">
        <div className="landing-logo">
          <div className="logo-icon">G</div>
          <span>GigHub</span>
        </div>
        <Link className="button-secondary sign-in-btn" href="/login">
          Sign In
        </Link>
      </header>

      <main className="landing-hero">
        <div className="hero-content">
          <p className="hero-quote">"The Secure Bridge to Your Next Big Gig."</p>
          <h1>Where Every Milestone is a Guaranteed Win.</h1>
          <p className="hero-sentence">
            GigHub is Malaysia's first escrow-backed marketplace that protects both freelancers 
            and companies through AI-validated workflows and secured payments.
          </p>
          <Link className="button-primary create-account-btn" href="/register">
            Create Account
          </Link>
        </div>
      </main>

      <section className="landing-advantages">
        <div className="advantage-card">
          <div className="advantage-icon"><ShieldIcon /></div>
          <h3>Payment Protection</h3>
          <p>Funds are secured in escrow and only released when you approve the work milestones.</p>
        </div>
        <div className="advantage-card">
          <div className="advantage-icon"><ZapIcon /></div>
          <h3>AI-Validated Work</h3>
          <p>Our Intelligent GLM ensures project briefs are clear and milestones meet the mark.</p>
        </div>
        <div className="advantage-card">
          <div className="advantage-icon"><CheckIcon /></div>
          <h3>Malaysia Ready</h3>
          <p>Built for the local economy with income intelligence and formal statement generation.</p>
        </div>
      </section>
    </div>
  );
}
