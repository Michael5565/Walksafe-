import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/how-it-works', label: 'How It Works' },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      borderBottom: '1px solid var(--color-border)',
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 64,
      }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 34,
            height: 34,
            background: 'var(--color-primary)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 800,
            fontSize: 16,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 12l2 2 4-4"/><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em', color: 'var(--color-text)' }}>
            Walk<span style={{ color: 'var(--color-primary)' }}>Safe</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav style={{ display: 'none', alignItems: 'center', gap: 32 }} className="md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              style={{
                fontSize: 14,
                fontWeight: location.pathname === link.href ? 600 : 500,
                color: location.pathname === link.href ? 'var(--color-primary)' : 'var(--color-text-muted)',
                textDecoration: 'none',
                transition: 'color 0.2s',
                letterSpacing: '0.01em',
              }}
            >
              {link.label}
            </Link>
          ))}
          <a
            href="https://app.getwalksafe.co.uk"
            style={{
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-button)',
              padding: '10px 20px',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              textDecoration: 'none',
              boxShadow: 'var(--shadow-cta)',
            }}
          >
            Start Free Trial
          </a>
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}
          className="md:hidden"
          aria-label="Toggle menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth="2">
            {menuOpen ? (
              <path d="M18 6L6 18M6 6l12 12" />
            ) : (
              <path d="M3 12h18M3 6h18M3 18h18" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile overlay */}
      {menuOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          top: 64,
          background: 'rgba(255,255,255,0.98)',
          zIndex: 40,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => setMenuOpen(false)}
              style={{
                fontSize: 20,
                fontWeight: location.pathname === link.href ? 700 : 500,
                color: location.pathname === link.href ? 'var(--color-primary)' : 'var(--color-text)',
                textDecoration: 'none',
                padding: '12px 24px',
              }}
            >
              {link.label}
            </Link>
          ))}
          <a
            href="https://app.getwalksafe.co.uk"
            onClick={() => setMenuOpen(false)}
            style={{
              marginTop: 16,
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-button)',
              padding: '14px 32px',
              fontWeight: 600,
              fontSize: 15,
              cursor: 'pointer',
              textDecoration: 'none',
            }}
          >
            Start Free Trial
          </a>
        </div>
      )}
    </header>
  );
}
