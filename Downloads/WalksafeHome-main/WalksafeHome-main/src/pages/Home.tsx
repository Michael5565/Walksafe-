import { Link } from 'react-router-dom';
import ComplianceWidget from '../components/ComplianceWidget';
import FeatureCard from '../components/FeatureCard';
import PlanCard from '../components/PlanCard';

const plans = [
  { id: 'solo', name: 'Solo Operator', description: 'For owner-drivers overseeing their own vehicle checks', monthlyPrice: 4.99, maxVehicles: 1, features: ['1 Active Vehicle', '1 Driver Profile', 'DVSA compliant checks', 'PDF audit reports', 'Offline-first logging'] },
  { id: 'starter', name: 'Starter Fleet', description: 'For small logistics operators with compact fleets', monthlyPrice: 14.99, maxVehicles: 3, features: ['Up to 3 Vehicles', 'Unlimited driver PIN accounts', 'Compliance dashboard', 'Real-time defect alerts', 'PDF report downloads'] },
  { id: 'growth', name: 'Growth Fleet', description: 'For industrial fleets needing complete compliance', monthlyPrice: 34.99, maxVehicles: 10, features: ['Up to 10 Vehicles', 'Analytics board', 'Audit schedule builder', 'Maintenance tracking', 'Priority support'] },
  { id: 'enterprise', name: 'Enterprise Scale', description: 'Custom capacity for multi-depot fleets', monthlyPrice: 0, maxVehicles: 99, features: ['Up to 99 Vehicles', 'Custom onboarding', 'Dedicated support', 'API access', 'SLA guarantee'] },
];

const features = [
  { icon: '✅', title: '27-Point DVSA Checklist', description: 'Full DVSA-compliant walkaround check covering every required inspection point. Drivers complete it in under a minute.' },
  { icon: '📸', title: 'Defect Photo Capture', description: 'Drivers photograph defects immediately. Images are timestamped and stored with the check record for audit purposes.' },
  { icon: '📍', title: 'GPS & Tamper-Proof Logs', description: 'Every check is geo-tagged and time-stamped. Tamper-evident logs give you legally defensible compliance records.' },
  { icon: '👤', title: 'Driver PIN & QR Access', description: '4-digit PIN sign-in and QR code vehicle stickers. Drivers access their assigned checks without passwords.' },
  { icon: '📊', title: 'Compliance Dashboard', description: 'Real-time view of all vehicle check statuses. See who has checked in and what defects need attention.' },
  { icon: '📄', title: 'PDF Audit Trail', description: 'One-click PDF export of any check. DVSA-ready format with driver signature, photos, and GPS data.' },
  { icon: '📅', title: 'Scheduled & Recurring Checks', description: 'Set daily, weekly, or custom check schedules. Automated reminders ensure nothing is missed.' },
  { icon: '🔧', title: 'Maintenance & Documents', description: 'Store MOT, tax, insurance documents. Get expiry alerts and link defects to maintenance workflows.' },
  { icon: '📡', title: 'Offline-First PWA', description: 'Works on mobile data or no signal. Checks sync automatically when connection returns.' },
  { icon: '⛽', title: 'Fuel, Parts & Work Orders', description: 'Track fuel purchases, parts inventory, and create work orders linked to vehicle defects.' },
  { icon: '🗺️', title: 'Live Fleet Map', description: 'See all vehicle locations on a live map. Know which drivers have completed their daily checks.' },
  { icon: '📈', title: 'Driver Scoring & Alerts', description: 'Score drivers on check completion rates. Get email alerts for missed checks and critical defects.' },
];

const sectors = [
  { title: 'Scaffolding Fleets', desc: 'Heavy loads, loose boards, compliant O-Licence logs. Scaffolding vehicles run under extreme stress.', link: '/scaffolding-fleets' },
  { title: 'Haulage & Logistics', desc: 'O-Licence compliance without the paperwork chaos. 15-month audit retention, roadside PDF export.', link: '/haulage-trade-fleets' },
  { title: 'Local Trade & Owner-Operators', desc: 'From plumbers to builders merchants. Keep your van fleet DVSA-compliant without the overhead.', link: '/haulage-trade-fleets' },
];

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section style={{
        background: 'linear-gradient(135deg, #EEF2FF 0%, #F8F9FB 60%, #FEF3C7 100%)',
        padding: '64px 24px',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr', gap: 40, alignItems: 'center' }} className="md:grid-cols-2">
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--color-text)', margin: '0 0 12px', lineHeight: 1.15 }} className="text-4xl md:text-5xl">
              If the DVSA pulled over your driver today, would you pass?
            </h1>
            <p style={{ fontSize: 16, color: 'var(--color-text-muted)', lineHeight: 1.6, margin: '0 0 24px', maxWidth: 480 }}>
              WalkSafe replaces paper logbooks with DVSA-compliant digital walkaround checks. Drivers complete it in under a minute. You see every result before they hit the road.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }} className="sm:flex-row sm:items-center">
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
                boxShadow: 'var(--shadow-cta)',
              }}>Start 30-Day Free Trial</a>
              <Link to="/how-it-works" style={{
                background: 'transparent',
                color: 'var(--color-primary)',
                border: '1.5px solid var(--color-primary)',
                borderRadius: 'var(--radius-button)',
                padding: '14px 28px',
                fontWeight: 600,
                fontSize: 15,
                cursor: 'pointer',
                textDecoration: 'none',
              }}>See How It Works</Link>
            </div>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 16 }}>No credit card &middot; No sales meeting &middot; Cancel anytime</p>
          </div>
          <div style={{ maxWidth: 380, margin: '0 auto' }} className="md:ml-auto">
            <ComplianceWidget />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ background: 'var(--color-surface)', padding: '32px 24px', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }} className="md:grid-cols-4">
          {[
            { stat: '<5 min', label: 'Average check duration' },
            { stat: '27 Points', label: 'Full DVSA inspection items' },
            { stat: '15 Months', label: 'Mandatory data retention' },
            { stat: '\u00a30', label: 'Setup & onboarding cost' },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: 'center', padding: '8px 0' }}>
              <span style={{ display: 'block', fontSize: 24, fontWeight: 800, color: 'var(--color-primary)', marginBottom: 2 }}>{s.stat}</span>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ padding: '64px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, textAlign: 'center', margin: '0 0 8px', letterSpacing: '-0.02em' }}>Everything you need to stay compliant</h2>
          <p style={{ fontSize: 15, color: 'var(--color-text-muted)', textAlign: 'center', margin: '0 0 40px' }}>No per-driver fees. No minimum vehicles. No long-term contracts.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }} className="sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => <FeatureCard key={f.title} {...f} />)}
          </div>
        </div>
      </section>

      {/* Sector Callout */}
      <section style={{ background: 'var(--color-surface)', padding: '48px 24px', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, textAlign: 'center', margin: '0 0 32px' }}>Built for your trade</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }} className="md:grid-cols-3">
            {sectors.map((s) => (
              <div key={s.title} style={{
                borderTop: '3px solid var(--color-primary)',
                borderLeft: '1px solid var(--color-border)',
                borderRight: '1px solid var(--color-border)',
                borderBottom: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-card)',
                padding: '24px 20px',
                background: 'var(--color-surface)',
              }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 8px' }}>{s.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 16px', lineHeight: 1.6 }}>{s.desc}</p>
                <Link to={s.link} style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none' }}>Learn more &rarr;</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section style={{ padding: '64px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, textAlign: 'center', margin: '0 0 40px', letterSpacing: '-0.02em' }}>How it works</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {[
              { num: '1', title: 'Create Account', desc: 'Enter your email and trade focus. Instant activation. No credit card required.' },
              { num: '2', title: 'Add Vehicles & Drivers', desc: 'Type your vehicle registrations. Generate QR stickers for each vehicle. Assign drivers with 4-digit PINs.' },
              { num: '3', title: 'Compliance Live', desc: 'Drivers complete walkaround checks on their phones. Results appear on your dashboard in real time.' },
            ].map((s) => (
              <div key={s.num} style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 16,
                  flexShrink: 0,
                }}>{s.num}</div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>{s.title}</h3>
                  <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.6 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section style={{ background: 'var(--color-bg)', padding: '64px 24px', borderTop: '1px solid var(--color-border)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, textAlign: 'center', margin: '0 0 40px', letterSpacing: '-0.02em' }}>Simple, transparent pricing</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }} className="sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((p) => <PlanCard key={p.id} plan={p} highlighted={p.id === 'starter'} />)}
          </div>
          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--color-text-muted)' }}>
            <Link to="/pricing" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>Compare all features &rarr;</Link>
          </p>
        </div>
      </section>

      {/* Trust signals (no fabricated testimonials) */}
      <section style={{ padding: '48px 24px', background: 'var(--color-surface)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
          {[
            'DVSA-Compliant',
            'No long-term contracts',
            'No per-driver fees',
            'Self-serve activation',
            'Cancel anytime',
          ].map((t) => (
            <span key={t} style={{
              background: '#F3F4F6',
              color: 'var(--color-text-muted)',
              padding: '8px 16px',
              borderRadius: 'var(--radius-badge)',
              fontSize: 13,
              fontWeight: 600,
            }}>{t}</span>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ background: 'var(--color-primary)', padding: '64px 24px' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.02em' }}>Stop relying on paper logbooks.</h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', margin: '0 0 24px' }}>Start your 30-day free trial. No credit card, no sales meeting, no risk.</p>
          <a href="https://app.getwalksafe.co.uk" style={{
            background: '#fff',
            color: 'var(--color-primary)',
            border: 'none',
            borderRadius: 'var(--radius-button)',
            padding: '14px 32px',
            fontWeight: 700,
            fontSize: 15,
            cursor: 'pointer',
            textDecoration: 'none',
            display: 'inline-block',
          }}>Start Free Trial</a>
        </div>
      </section>
    </main>
  );
}
