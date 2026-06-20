import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'walksafe_announcement_dismissed';

export default function AnnouncementBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div style={{
      background: '#FEF3C7',
      color: '#92400E',
      fontSize: 13,
      fontWeight: 500,
      textAlign: 'center',
      padding: '8px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      position: 'relative',
    }}>
      <span>30-day free trial, no credit card required &mdash;</span>
      <Link to="/pricing" style={{ color: '#92400E', fontWeight: 700, textDecoration: 'underline' }}>See plans &amp; pricing</Link>
      <button onClick={dismiss} style={{ position: 'absolute', right: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#92400E', fontSize: 16, padding: 4 }} aria-label="Dismiss">&times;</button>
    </div>
  );
}
