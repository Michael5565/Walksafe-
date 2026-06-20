import { Link } from 'react-router-dom';
import ComplianceWidget from '../components/ComplianceWidget';
import FeatureCard from '../components/FeatureCard';
import PlanCard from '../components/PlanCard';

const criticalChecks = [
  { num: '01', title: 'Leaf Springs & Suspension', desc: 'Check for cracks, broken leaves, or displacement. Suspension failure on a laden scaffolding vehicle is a prohibition risk.' },
  { num: '02', title: 'Load Restraint & Tie Straps', desc: 'Inspect all tie-down points and ratchet straps. Loose board loads are the leading cause of scaffolding vehicle roadside stops.' },
  { num: '03', title: 'Guardrails & Edge Protection', desc: 'Verify guardrails are secure and undamaged. Exposed scaffold tubes in transit create immediate danger to other road users.' },
  { num: '04', title: 'Tail Lamp & Marker Light Cluster', desc: 'Check all rear lighting functions. Obstructed or failed tail lamps on a flatbed result in immediate prohibitions.' },
  { num: '05', title: 'Nearside & Offside Mirrors', desc: 'Confirm mirrors are intact, clean, and properly adjusted. Restricted view is a frequent DVSA prohibition trigger.' },
];

const plans = [
  { id: 'solo', name: 'Solo Operator', description: 'For owner-drivers', monthlyPrice: 4.99, maxVehicles: 1, features: ['1 Vehicle', 'Full DVSA checks', 'PDF audit trail', 'Offline-first'] },
  { id: 'starter', name: 'Starter Fleet', description: 'For small scaffolding fleets', monthlyPrice: 14.99, maxVehicles: 3, features: ['Up to 3 Vehicles', 'Dashboard', 'Defect alerts', 'PDF exports'] },
  { id: 'growth', name: 'Growth Fleet', description: 'For larger operations', monthlyPrice: 34.99, maxVehicles: 10, features: ['Up to 10 Vehicles', 'Analytics', 'Scheduled checks', 'Priority support'] },
];

export default function ScaffoldingFleets() {
  return (
    <main>
      {/* Hero */}
      <section style={{
        background: 'linear-gradient(135deg, #EEF2FF 0%, #F8F9FB 60%, #FEF3C7 100%)',
        padding: '64px 24px',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr', gap: 40, alignItems: 'center' }} className="md:grid-cols-2">
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#FEF3C7',
              color: '#92400E',
              padding: '6px 12px',
              borderRadius: 'var(--radius-badge)',
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 16,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 9v4M12 17v0"/><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Up to &pound;1,500 fine per offence under Section 40A RTA 1988
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--color-text)', margin: '0 0 12px', lineHeight: 1.15 }} className="text-4xl md:text-5xl">
              Heavy loads. Loose boards. Compliant O-Licence logs.
            </h1>
            <p style={{ fontSize: 16, color: 'var(--color-text-muted)', lineHeight: 1.6, margin: '0 0 24px', maxWidth: 480 }}>
              Scaffolding vehicles run under extreme stress. WalkSafe keeps your checks legally defensible without slowing your crews down.
            </p>
            <a href="https://app.getwalksafe.co.uk" style={{
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-button)',
              padding: '14px 28px',
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
              textDecoration: 'none',
              display: 'inline-block',
              boxShadow: 'var(--shadow-cta)',
            }}>Activate 30-Day Free Trial</a>
          </div>
          <div style={{ maxWidth: 340, margin: '0 auto' }} className="md:ml-auto">
            <ComplianceWidget />
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section style={{ background: 'var(--color-surface)', padding: '24px 24px', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }} className="md:grid-cols-4">
          {[
            { stat: '27', label: 'DVSA check points per vehicle' },
            { stat: '<1 min', label: 'Time to complete a check' },
            { stat: '15 mo', label: 'Mandatory records retention' },
            { stat: '\u00a30', label: 'Setup cost' },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: 20, fontWeight: 800, color: 'var(--color-primary)' }}>{s.stat}</span>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 5 Critical Checks */}
      <section style={{ padding: '64px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, textAlign: 'center', margin: '0 0 8px' }}>5 critical checks for scaffolding fleets</h2>
          <p style={{ fontSize: 15, color: 'var(--color-text-muted)', textAlign: 'center', margin: '0 0 40px' }}>These items are the most common DVSA prohibition triggers on scaffolding vehicles.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }} className="sm:grid-cols-2 lg:grid-cols-3">
            {criticalChecks.map((c) => (
              <div key={c.num} style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-card)',
                boxShadow: 'var(--shadow-card)',
                padding: '24px 20px',
              }}>
                <span style={{
                  display: 'inline-block',
                  background: '#FEF3C7',
                  color: '#92400E',
                  fontWeight: 800,
                  fontSize: 12,
                  padding: '2px 10px',
                  borderRadius: 'var(--radius-badge)',
                  marginBottom: 12,
                  fontFamily: 'monospace',
                }}>{c.num}</span>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 6px' }}>{c.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.6 }}>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How WalkSafe helps */}
      <section style={{ background: 'var(--color-surface)', padding: '48px 24px', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, textAlign: 'center', margin: '0 0 32px' }}>How WalkSafe helps scaffolding fleets</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }} className="md:grid-cols-3">
            {[
              { icon: '\u2696\ufe0f', title: 'Instant Proof of Secure Loading', desc: 'Drivers photograph secured loads as part of the check. Timestamped evidence protects you in a DVSA inspection.' },
              { icon: '\u26a0\ufe0f', title: 'Immediate Yard Defect Notification', desc: 'The moment a driver flags a defect, you get an email alert. No more discovering broken leaf springs at the depot the next morning.' },
              { icon: '\ud83d\udcc4', title: 'Roadside PDF Inspection Code', desc: 'Inspectors can request a compliance PDF on the spot. Your driver hands over proof of a completed check in seconds.' },
            ].map((f) => (
              <div key={f.title} style={{ textAlign: 'center', padding: '20px' }}>
                <span style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>{f.icon}</span>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 6px' }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing strip */}
      <section style={{ padding: '48px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, textAlign: 'center', margin: '0 0 4px' }}>No per-driver fees. No minimum vehicles.</h2>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', textAlign: 'center', margin: '0 0 32px' }}>Every plan includes all features. Month-to-month. Cancel anytime.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }} className="sm:grid-cols-3">
            {plans.map((p) => <PlanCard key={p.id} plan={p} highlighted={p.id === 'starter'} />)}
          </div>
          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--color-text-muted)' }}>
            <Link to="/pricing" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>View full pricing &amp; feature comparison &rarr;</Link>
          </p>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'var(--color-primary)', padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>Protect your O-Licence. Start today.</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', margin: '0 0 24px' }}>30-day free trial. No credit card. No contract.</p>
          <a href="https://app.getwalksafe.co.uk" style={{ background: '#fff', color: 'var(--color-primary)', border: 'none', borderRadius: 'var(--radius-button)', padding: '14px 32px', fontWeight: 700, fontSize: 15, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }}>Start Free Trial</a>
        </div>
      </section>
    </main>
  );
}
