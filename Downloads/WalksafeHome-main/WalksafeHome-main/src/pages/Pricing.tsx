import PlanCard from '../components/PlanCard';

const plans = [
  { id: 'solo', name: 'Solo Operator', description: 'For owner-drivers', monthlyPrice: 4.99, maxVehicles: 1, features: ['1 Active Vehicle', '1 Driver Profile', 'DVSA compliant checks', 'PDF audit reports', 'Offline-first logging'] },
  { id: 'starter', name: 'Starter Fleet', description: 'For small fleets', monthlyPrice: 14.99, maxVehicles: 3, features: ['Up to 3 Vehicles', 'Unlimited driver PIN accounts', 'Compliance dashboard', 'Real-time defect alerts', 'PDF report downloads', 'Scheduled checks'] },
  { id: 'growth', name: 'Growth Fleet', description: 'For growing operations', monthlyPrice: 34.99, maxVehicles: 10, features: ['Up to 10 Vehicles', 'Analytics board', 'Audit schedule builder', 'Maintenance tracking', 'Work orders', 'Priority support', 'API access'] },
  { id: 'enterprise', name: 'Enterprise Scale', description: 'For multi-depot fleets', monthlyPrice: 0, maxVehicles: 99, features: ['Up to 99 Vehicles', 'Custom onboarding', 'Dedicated support', 'Full API access', 'SLA guarantee'] },
];

const featureRows = [
  { f: 'DVSA 27-Point Checks', s: true, st: true, g: true, e: true },
  { f: 'Defect Photo Capture', s: true, st: true, g: true, e: true },
  { f: 'GPS & Tamper-Proof Logs', s: true, st: true, g: true, e: true },
  { f: 'PDF Audit Trail', s: true, st: true, g: true, e: true },
  { f: 'Offline-First PWA', s: true, st: true, g: true, e: true },
  { f: 'Compliance Dashboard', s: false, st: true, g: true, e: true },
  { f: 'Real-Time Defect Alerts', s: false, st: true, g: true, e: true },
  { f: 'Scheduled Checks', s: false, st: true, g: true, e: true },
  { f: 'Driver Management', s: false, st: true, g: true, e: true },
  { f: 'Maintenance Tracking', s: false, st: false, g: true, e: true },
  { f: 'Analytics Board', s: false, st: false, g: true, e: true },
  { f: 'Fuel, Parts & Work Orders', s: false, st: false, g: true, e: true },
  { f: 'Live Fleet Map', s: false, st: false, g: true, e: true },
  { f: 'Driver Scoring', s: false, st: false, g: true, e: true },
  { f: 'API Access', s: false, st: false, g: false, e: true },
];

export default function Pricing() {
  return (
    <main>
      <section style={{ padding: '64px 24px 48px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 8px' }}>Flat rates. No per-driver fees. No surprises.</h1>
        <p style={{ fontSize: 15, color: 'var(--color-text-muted)', margin: '0 0 40px' }}>Month-to-month. Cancel anytime. 30-day free trial on every plan.</p>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr', gap: 20 }} className="sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => <PlanCard key={p.id} plan={p} highlighted={p.id === 'starter'} />)}
        </div>
      </section>
      <section style={{ maxWidth: 800, margin: '0 auto 40px', padding: '0 24px' }}>
        <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 'var(--radius-card)', padding: '16px 20px', fontSize: 13, color: '#92400E', lineHeight: 1.6 }}>
          <strong>Compare: </strong>FleetCheck starts at &pound;3/vehicle/month with a 10-vehicle minimum and a 36-month contract. WalkSafe has no minimums, no long-term commitments, and no per-driver fees.
        </div>
      </section>
      <section style={{ padding: '0 24px 64px', overflowX: 'auto' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Full feature comparison</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700 }}>Feature</th>
                {plans.map((p) => <th key={p.id} style={{ textAlign: 'center', padding: '12px 8px', fontWeight: 700, color: p.id === 'starter' ? 'var(--color-primary)' : 'var(--color-text)' }}>{p.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {featureRows.map((r) => (
                <tr key={r.f} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '10px 16px', fontWeight: 500 }}>{r.f}</td>
                  <td style={{ textAlign: 'center', padding: '10px 8px' }}>{r.s ? '\u2705' : '\u2014'}</td>
                  <td style={{ textAlign: 'center', padding: '10px 8px' }}>{r.st ? '\u2705' : '\u2014'}</td>
                  <td style={{ textAlign: 'center', padding: '10px 8px' }}>{r.g ? '\u2705' : '\u2014'}</td>
                  <td style={{ textAlign: 'center', padding: '10px 8px' }}>{r.e ? '\u2705' : '\u2014'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
