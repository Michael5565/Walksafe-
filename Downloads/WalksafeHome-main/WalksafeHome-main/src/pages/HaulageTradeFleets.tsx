import { Link } from 'react-router-dom';
import ComplianceWidget from '../components/ComplianceWidget';
import PlanCard from '../components/PlanCard';

const plans = [
  { id: 'solo', name: 'Solo Operator', description: 'For owner-drivers', monthlyPrice: 4.99, maxVehicles: 1, features: ['1 Vehicle', 'DVSA checks', 'PDF audit trail', 'Offline-first'] },
  { id: 'starter', name: 'Starter Fleet', description: 'For small haulage fleets', monthlyPrice: 14.99, maxVehicles: 3, features: ['Up to 3 Vehicles', 'Dashboard', 'Defect alerts', 'PDF exports'] },
  { id: 'growth', name: 'Growth Fleet', description: 'For larger logistics ops', monthlyPrice: 34.99, maxVehicles: 10, features: ['Up to 10 Vehicles', 'Analytics', 'Scheduled checks', 'Priority support'] },
];

export default function HaulageTradeFleets() {
  return (
    <main>
      <section style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #F8F9FB 60%, #FEF3C7 100%)', padding: '64px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr', gap: 40, alignItems: 'center' }} className="md:grid-cols-2">
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FEF3C7', color: '#92400E', padding: '6px 12px', borderRadius: 'var(--radius-badge)', fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 9v4M12 17v0"/><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              DVSA roadside checks can result in immediate prohibition notices
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--color-text)', margin: '0 0 12px', lineHeight: 1.15 }} className="text-4xl md:text-5xl">
              O-Licence compliance without the paperwork chaos.
            </h1>
            <p style={{ fontSize: 16, color: 'var(--color-text-muted)', lineHeight: 1.6, margin: '0 0 24px', maxWidth: 480 }}>
              Full 27-point DVSA checks, 15-month audit retention, and instant roadside PDF export. WalkSafe keeps your fleet legally compliant without the filing cabinet.
            </p>
            <a href="https://app.getwalksafe.co.uk" style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-button)', padding: '14px 28px', fontWeight: 700, fontSize: 15, cursor: 'pointer', textDecoration: 'none', display: 'inline-block', boxShadow: 'var(--shadow-cta)' }}>Activate 30-Day Free Trial</a>
          </div>
          <div style={{ maxWidth: 340, margin: '0 auto' }} className="md:ml-auto">
            <ComplianceWidget />
          </div>
        </div>
      </section>

      <section style={{ padding: '48px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, textAlign: 'center', margin: '0 0 32px' }}>How WalkSafe helps haulage & trade fleets</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }} className="md:grid-cols-3">
            {[
              { icon: '\u2705', title: 'Full DVSA 27-Point Checks', desc: 'Every check covers brakes, tyres, lights, suspension, bodywork, and safety equipment. Legally defensible and DVSA-compliant.' },
              { icon: '\ud83d\udcc5', title: '15-Month Audit Retention', desc: 'All check records stored for 15 months as required by law. Exportable PDF with driver signature and GPS data.' },
              { icon: '\ud83d\udcc4', title: 'Roadside PDF Export', desc: 'Generate a compliance PDF on the spot during a DVSA inspection. Your drivers have proof of their last check within seconds.' },
            ].map((f) => (
              <div key={f.title} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-card)', padding: '24px 20px', textAlign: 'center' }}>
                <span style={{ fontSize: 28, display: 'block', marginBottom: 8 }}>{f.icon}</span>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 6px' }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: 'var(--color-surface)', padding: '48px 24px', borderTop: '1px solid var(--color-border)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, textAlign: 'center', margin: '0 0 32px' }}>Simple pricing, no per-driver fees</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }} className="sm:grid-cols-3">
            {plans.map((p) => <PlanCard key={p.id} plan={p} highlighted={p.id === 'starter'} />)}
          </div>
          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--color-text-muted)' }}>
            <Link to="/pricing" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>View full pricing &rarr;</Link>
          </p>
        </div>
      </section>

      <section style={{ background: 'var(--color-primary)', padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>Ditch the paper logbooks.</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', margin: '0 0 24px' }}>30-day free trial. No credit card. No contract.</p>
          <a href="https://app.getwalksafe.co.uk" style={{ background: '#fff', color: 'var(--color-primary)', border: 'none', borderRadius: 'var(--radius-button)', padding: '14px 32px', fontWeight: 700, fontSize: 15, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }}>Start Free Trial</a>
        </div>
      </section>
    </main>
  );
}
