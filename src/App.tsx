import React, { useState, useEffect } from 'react';
import { PromoSite } from './components/PromoSite';
import { AdminDashboard } from './components/AdminDashboard';

export default function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (path === '/admin') {
     return <AdminDashboard />;
  }
  
  return <PromoSite />;
}

