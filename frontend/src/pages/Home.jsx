import { ArrowRight, BarChart3, CalendarCheck2, ShieldCheck, WalletCards } from 'lucide-react'
import { Link } from 'react-router-dom'

function Home() {
  return (
    <main className="home-page">
      <header className="home-header">
        <Link className="home-brand" to="/"><span className="brand-mark">P</span><span>PeoplePay360</span></Link>
        <div className="home-header-actions"><Link className="home-demo-link" to="/demo-credentials">Demo accounts</Link><Link className="home-login-link" to="/login">Sign in <ArrowRight size={16} aria-hidden="true" /></Link></div>
      </header>
      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="eyebrow">People operations, made clear</p>
          <h1>Run your people and payroll in one calm workspace.</h1>
          <p className="home-intro">Manage employees, contracts, attendance, leave, salary rules, and payroll from a single operational system.</p>
          <div className="home-actions"><Link className="primary-action home-primary-action" to="/login">Open your workspace <ArrowRight size={17} aria-hidden="true" /></Link><span>Secure access for HR and payroll teams</span></div>
        </div>
        <div className="home-hero-visual" aria-label="PeoplePay360 payroll overview preview">
          <div className="home-visual-header"><span>September payroll</span><strong>Ready</strong></div>
          <div className="home-visual-total"><small>Net salary this month</small><strong>₹12.5 Lakh</strong></div>
          <div className="home-visual-bars"><span style={{ height: '47%' }} /><span style={{ height: '68%' }} /><span style={{ height: '55%' }} /><span style={{ height: '83%' }} /><span style={{ height: '72%' }} /><span style={{ height: '96%' }} /></div>
          <div className="home-visual-footer"><span>245 payslips</span><span>98% complete</span></div>
        </div>
      </section>
      <section className="home-features" aria-label="PeoplePay360 capabilities">
        <article><div className="home-feature-icon"><UsersIcon /></div><h2>One employee record</h2><p>Keep profiles, contracts, schedules, and employment history connected.</p></article>
        <article><div className="home-feature-icon"><CalendarCheck2 size={20} aria-hidden="true" /></div><h2>Confident decisions</h2><p>Approve leave, surface warnings, and keep every workflow accountable.</p></article>
        <article><div className="home-feature-icon"><WalletCards size={20} aria-hidden="true" /></div><h2>Payroll that explains itself</h2><p>Salary rules drive each calculation from gross salary to net payslip.</p></article>
      </section>
      <footer className="home-footer"><span>PeoplePay360</span><span><ShieldCheck size={14} aria-hidden="true" /> Built for responsible people operations</span><BarChart3 size={17} aria-hidden="true" /></footer>
    </main>
  )
}

function UsersIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
}

export default Home