const phases = [
  {
    title: 'Phase 1 \u2014 Setup',
    subtitle: 'Under 10 minutes',
    steps: [
      { num: '1', title: 'Create account', desc: 'Enter your email and trade focus. Instant activation. No credit card required.' },
      { num: '2', title: 'Add vehicle registrations', desc: 'Type your vehicle registrations into the dashboard. Set your fleet size in seconds.' },
      { num: '3', title: 'Generate QR code stickers', desc: 'Print QR stickers from the dashboard. Stick them on each vehicle windscreen.' },
    ],
  },
  {
    title: 'Phase 2 \u2014 Daily Driver Flow',
    subtitle: 'Under 1 minute per vehicle',
    steps: [
      { num: '4', title: 'Driver taps QR sticker', desc: 'Driver scans their vehicle QR code with their phone camera. The PWA loads instantly. No app store download.' },
      { num: '5', title: 'Complete 27-point walkaround', desc: 'Driver works through the DVSA checklist on their phone. Each item is pass/fail with photo evidence if needed.' },
      { num: '6', title: 'Sign digitally', desc: 'Driver signs on screen. Check is timestamped and geo-tagged. If defects were flagged, an alert fires immediately.' },
    ],
  },
  {
    title: 'Phase 3 \u2014 Manager Oversight',
    subtitle: 'Real-time visibility',
    steps: [
      { num: '7', title: 'Dashboard shows pass/fail status', desc: 'Your compliance dashboard updates in real time. Every vehicle status is visible at a glance.' },
      { num: '8', title: 'Email alert on defect', desc: 'If a driver flags a critical defect, you get an email instantly. No more discovering problems the next morning.' },
      { num: '9', title: 'PDF export for DVSA inspection', desc: 'Generate a compliance PDF with one click. DVSA-ready format with driver signature, photos, and GPS coordinates.' },
    ],
  },
];

export default function HowItWorks() {
  return (
    <main>
      <section style={{ padding: '64px 24px', textAlign: 'center', background: 'linear-gradient(135deg, #EEF2FF 0%, #F8F9FB 60%, #FEF3C7 100%)' }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 8px' }}>How WalkSafe works</h1>
        <p style={{ fontSize: 15, color: 'var(--color-text-muted)', margin: '0 0 0' }}>From setup to compliance in under 10 minutes.</p>
      </section>

      <section style={{ padding: '48px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          {phases.map((phase, pi) => (
            <div key={pi} style={{ marginBottom: pi < phases.length - 1 ? 48 : 0 }}>
              <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 2px', color: 'var(--color-primary)' }}>{phase.title}</h2>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0, fontWeight: 500 }}>{phase.subtitle}</p>
              </div>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 22, top: 0, bottom: 0, width: 2, background: 'var(--color-primary)', opacity: 0.3 }} />
                {phase.steps.map((step, si) => (
                  <div key={step.num} style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: si < phase.steps.length - 1 ? 28 : 0, position: 'relative' }}>
                    <div style={{
                      width: 46, height: 46, borderRadius: '50%',
                      background: step.num === '6' || step.num === '8' ? '#FEF3C7' : 'var(--color-primary)',
                      color: step.num === '6' || step.num === '8' ? '#92400E' : '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: 15, flexShrink: 0, position: 'relative', zIndex: 1,
                      border: step.num === '6' || step.num === '8' ? '2px solid #FDE68A' : 'none',
                    }}>
                      {step.num}
                    </div>
                    <div style={{ paddingTop: 8 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>{step.title}</h3>
                      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.6 }}>{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ background: 'var(--color-primary)', padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>Start your 30-day free trial</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', margin: '0 0 24px' }}>No credit card. No sales meeting. Cancel anytime.</p>
          <a href="https://app.getwalksafe.co.uk" style={{ background: '#fff', color: 'var(--color-primary)', border: 'none', borderRadius: 'var(--radius-button)', padding: '14px 32px', fontWeight: 700, fontSize: 15, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }}>Start Free Trial</a>
        </div>
      </section>
    </main>
  );
}
