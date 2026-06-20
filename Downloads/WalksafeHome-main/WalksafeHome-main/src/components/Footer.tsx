import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer style={{ background: '#fff', borderTop: '1px solid var(--color-border)', padding: '48px 24px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 32,
          marginBottom: 32,
        }}>
          <div>
            <h4 style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text)', marginBottom: 16 }}>Product</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link to="/features" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: 14 }}>Features</Link>
              <Link to="/pricing" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: 14 }}>Pricing</Link>
              <Link to="/how-it-works" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: 14 }}>How It Works</Link>
              <a href="https://app.getwalksafe.co.uk" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: 14 }}>Dashboard</a>
            </div>
          </div>
          <div>
            <h4 style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text)', marginBottom: 16 }}>Trade Sectors</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link to="/scaffolding-fleets" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: 14 }}>Scaffolding Fleets</Link>
              <Link to="/haulage-trade-fleets" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: 14 }}>Haulage & Trade</Link>
            </div>
          </div>
          <div>
            <h4 style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text)', marginBottom: 16 }}>Legal</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a href="/privacy.html" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: 14 }}>Privacy Policy</a>
              <a href="/terms.html" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: 14 }}>Terms of Service</a>
              <a href="/refund-policy.html" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: 14 }}>Refund Policy</a>
            </div>
          </div>
          <div>
            <h4 style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text)', marginBottom: 16 }}>Contact</h4>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14, margin: 0 }}>hellos@getwalksafe.co.uk</p>
            <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--color-success)', color: '#fff', padding: '4px 10px', borderRadius: 'var(--radius-badge)', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em' }}>
              DVSA-Compliant
            </div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 20, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
          &copy; 2026 WalkSafe. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
