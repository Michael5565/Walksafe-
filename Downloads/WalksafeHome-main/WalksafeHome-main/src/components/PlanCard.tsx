import { Link } from 'react-router-dom';

interface Plan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  maxVehicles: number;
  features: string[];
}

interface PlanCardProps {
  plan: Plan;
  highlighted?: boolean;
}

export default function PlanCard({ plan, highlighted }: PlanCardProps) {
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: highlighted ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
      borderRadius: 'var(--radius-card)',
      boxShadow: highlighted ? '0 4px 16px rgba(26,86,219,0.12)' : 'var(--shadow-card)',
      padding: '28px 24px',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {highlighted && (
        <span style={{
          position: 'absolute',
          top: -12,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--color-primary)',
          color: '#fff',
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          padding: '4px 14px',
          borderRadius: 'var(--radius-badge)',
        }}>
          Most Popular
        </span>
      )}
      <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 4px' }}>{plan.name}</h3>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 16px' }}>{plan.description}</p>
      <div style={{ marginBottom: 16 }}>
        {plan.monthlyPrice > 0 ? (
          <>
            <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-primary)' }}>&pound;{plan.monthlyPrice}</span>
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)', marginLeft: 4 }}>/mo after trial</span>
          </>
        ) : (
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-muted)' }}>Custom pricing</span>
        )}
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {plan.features.map((f, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-text-muted)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
            {f}
          </li>
        ))}
      </ul>
      {plan.id === 'enterprise' ? (
        <a href="mailto:hellos@getwalksafe.co.uk" style={{
          width: '100%',
          padding: '12px 0',
          background: 'transparent',
          color: 'var(--color-primary)',
          border: '1.5px solid var(--color-primary)',
          borderRadius: 'var(--radius-button)',
          fontWeight: 600,
          fontSize: 13,
          cursor: 'pointer',
          textAlign: 'center',
          textDecoration: 'none',
        }}>Get in Touch</a>
      ) : (
        <a href={`https://app.getwalksafe.co.uk/?plan=${plan.id}`} style={{
          width: '100%',
          padding: '12px 0',
          background: highlighted ? 'var(--color-primary)' : 'var(--color-primary)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--radius-button)',
          fontWeight: 600,
          fontSize: 13,
          cursor: 'pointer',
          textAlign: 'center',
          textDecoration: 'none',
          boxShadow: highlighted ? 'var(--shadow-cta)' : 'none',
        }}>Start Free Trial</a>
      )}
    </div>
  );
}
