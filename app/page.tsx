"use client";

import { useEffect } from 'react';

export default function HomePage() {
  useEffect(() => {
    window.location.href = '/dashboard';
  }, []);

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p>جاري التوجيه إلى لوحة التحكم...</p>
    </div>
  );
}
