export default function ComplianceWidget() {
  const vehicles = [
    { reg: 'AB12 CDE', status: 'passed', defect: null },
    { reg: 'XY61 FGH', status: 'defect', defect: 'Nearside mirror cracked' },
    { reg: 'LM20 XYZ', status: 'passed', defect: null },
    { reg: 'KV72 JKL', status: 'passed', defect: null },
    { reg: 'PJ18 MNO', status: 'defect', defect: 'Offside brake light out' },
  ];

  const passed = vehicles.filter(v => v.status === 'passed').length;
  const defects = vehicles.filter(v => v.status === 'defect').length;

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-card)',
      boxShadow: 'var(--shadow-card)',
      overflow: 'hidden',
      width: '100%',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text)' }}>Compliance Status</span>
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 500 }}>Today</span>
      </div>
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
        <div style={{ padding: '12px 20px', textAlign: 'center', borderRight: '1px solid var(--color-border)' }}>
          <span style={{ display: 'block', fontSize: 22, fontWeight: 800, color: 'var(--color-success)' }}>{passed}</span>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Passed</span>
        </div>
        <div style={{ padding: '12px 20px', textAlign: 'center' }}>
          <span style={{ display: 'block', fontSize: 22, fontWeight: 800, color: 'var(--color-danger)' }}>{defects}</span>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Defects</span>
        </div>
      </div>
      {/* Vehicle list */}
      <div style={{ borderTop: '1px solid var(--color-border)' }}>
        {vehicles.map((v) => (
          <div key={v.reg} style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', fontSize: 13 }}>
            <span style={{ fontWeight: 600, fontFamily: 'monospace', letterSpacing: '0.04em', color: 'var(--color-text)' }}>{v.reg}</span>
            {v.status === 'passed' ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-success)', fontWeight: 600 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                Passed
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-accent)', fontWeight: 600 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 9v4M12 17v0"/><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                Defect
              </span>
            )}
          </div>
        ))}
      </div>
      {defects > 0 && (
        <div style={{ padding: '10px 20px', background: '#FEF3C7', fontSize: 11, color: '#92400E', fontWeight: 500 }}>
          {defects} vehicle{defects > 1 ? 's' : ''} flagged &mdash; check dashboard
        </div>
      )}
    </div>
  );
}
