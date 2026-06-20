import FeatureCard from '../components/FeatureCard';

const driverTools = [
  { icon: '\u2705', title: '27-Point DVSA Checklist', description: 'Full DVSA-compliant walkaround check covering every required inspection point. Drivers complete it in under a minute.' },
  { icon: '\ud83d\udcf7', title: 'Defect Photo Capture', description: 'Photograph defects with timestamped, geo-tagged images attached to the check record.' },
  { icon: '\ud83d\udcf6', title: 'Offline-First PWA', description: 'Works on mobile data or no signal. Checks sync automatically when connection returns.' },
  { icon: '\ud83d\udd11', title: '4-Digit PIN Sign-In', description: 'Simple PIN access for drivers. No passwords to remember or reset.' },
  { icon: '\ud83d\udcf1', title: 'QR Code Vehicle Access', description: 'Print QR stickers for each vehicle. Drivers tap to start their check instantly.' },
];

const managerTools = [
  { icon: '\ud83d\udcca', title: 'Compliance Dashboard', description: 'Real-time view of all vehicle check statuses. See who has checked in and what defects need attention.' },
  { icon: '\ud83d\udcc4', title: 'PDF Audit Trail', description: 'One-click PDF export of any check. DVSA-ready format with driver signature, photos, and GPS data.' },
  { icon: '\ud83d\udd14', title: 'Real-Time Defect Alerts', description: 'Email alert fires immediately when a driver flags a critical defect during their walkaround.' },
  { icon: '\ud83d\udcc5', title: 'Scheduled Checks', description: 'Set daily, weekly, or custom check schedules. Automated reminders ensure nothing is missed.' },
  { icon: '\ud83d\udd27', title: 'Maintenance & Documents', description: 'Store MOT, tax, insurance documents. Get expiry alerts and link defects to maintenance workflows.' },
];

const opsTools = [
  { icon: '\u26fd', title: 'Fuel, Parts & Work Orders', description: 'Track fuel purchases, parts inventory, and create work orders linked to vehicle defects.' },
  { icon: '\ud83d\uddfa\ufe0f', title: 'Live Fleet Map', description: 'See all vehicle locations on a live map. Know which drivers have completed their daily checks.' },
  { icon: '\ud83c\udfc6', title: 'Driver Scoring & Alerts', description: 'Score drivers on check completion rates. Get email alerts for missed checks and critical defects.' },
  { icon: '\ud83d\udd17', title: 'API Dashboard Data Access', description: 'Pull compliance data into your own systems via our REST API. Webhook support for custom integrations.' },
];

export default function FeaturesPage() {
  return (
    <main>
      <section style={{ padding: '64px 24px', textAlign: 'center', background: 'linear-gradient(135deg, #EEF2FF 0%, #F8F9FB 60%, #FEF3C7 100%)' }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 8px' }}>All the tools your fleet needs</h1>
        <p style={{ fontSize: 15, color: 'var(--color-text-muted)', margin: '0 0 0' }}>No feature gating. Every plan includes everything.</p>
      </section>

      <section style={{ padding: '48px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 22 }}>{'\ud83d\udc68\u200d\ud83d\uded2'}</span> Driver Tools</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }} className="sm:grid-cols-2 lg:grid-cols-3">
            {driverTools.map((f) => <FeatureCard key={f.title} {...f} />)}
          </div>
        </div>
      </section>

      <section style={{ padding: '48px 24px', background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 22 }}>{'\ud83d\udcbb'}</span> Fleet Manager Tools</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }} className="sm:grid-cols-2 lg:grid-cols-3">
            {managerTools.map((f) => <FeatureCard key={f.title} {...f} />)}
          </div>
        </div>
      </section>

      <section style={{ padding: '48px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 22 }}>{'\u2699\ufe0f'}</span> Operations Tools</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }} className="sm:grid-cols-2 lg:grid-cols-3">
            {opsTools.map((f) => <FeatureCard key={f.title} {...f} />)}
          </div>
        </div>
      </section>

      <section style={{ background: 'var(--color-primary)', padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>Ready to get started?</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', margin: '0 0 24px' }}>30-day free trial. No credit card. No contract.</p>
          <a href="https://app.getwalksafe.co.uk" style={{ background: '#fff', color: 'var(--color-primary)', border: 'none', borderRadius: 'var(--radius-button)', padding: '14px 32px', fontWeight: 700, fontSize: 15, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }}>Start Free Trial</a>
        </div>
      </section>
    </main>
  );
}
