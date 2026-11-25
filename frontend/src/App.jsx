import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth';
import Layout from './components/Layout';
import { Spinner } from './components/ui';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Monitoring from './pages/Monitoring';
import Compliance from './pages/Compliance';
import Reports from './pages/Reports';
import Admin from './pages/Admin';
import PublicLayout from './components/PublicLayout';
import About from './pages/public/About';
import Features from './pages/public/Features';
import HowItWorks from './pages/public/HowItWorks';
import SafetyStandards from './pages/public/SafetyStandards';
import FAQ from './pages/public/FAQ';
import Contact from './pages/public/Contact';

function Guard({ roles }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <Layout />;
}
export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/features" element={<Features />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/safety-standards" element={<SafetyStandards />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/contact" element={<Contact />} />
      </Route>
      <Route path="/login" element={<Login />} />
      <Route element={<Guard />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/monitoring" element={<Monitoring />} />
        <Route path="/compliance" element={<Compliance />} />
        <Route path="/reports" element={<Reports />} />
      </Route>
      <Route element={<Guard roles={['admin']} />}><Route path="/admin" element={<Admin />} /></Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
