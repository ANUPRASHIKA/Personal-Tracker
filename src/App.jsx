import { useState } from 'react';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import ShiftLog from './pages/ShiftLog';
import CommuteLog from './pages/CommuteLog';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import { DataProvider } from './context/DataContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';

const PAGES = {
  dashboard: Dashboard,
  shift: ShiftLog,
  commute: CommuteLog,
  reports: Reports,
  settings: Settings,
};

function SignInScreen() {
  const { signIn } = useAuth();
  return (
    <div className="signin-screen">
      <div className="brand">
        <span className="brand-dot"></span>
        Personal Tracker
      </div>
      <p>Sign in to sync your data across devices.</p>
      <button className="btn btn-primary" onClick={signIn}>Sign in with Google</button>
    </div>
  );
}

function AppShell() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { user, loading, signOutUser } = useAuth();
  const Page = PAGES[activeTab];

  if (loading) return <div className="app-loading">Loading…</div>;
  if (!user) return <SignInScreen />;

  return (
    <DataProvider>
      <ToastProvider>
        <div className="app">
          <Header activeTab={activeTab} onChangeTab={setActiveTab} user={user} onSignOut={signOutUser} />
          <main className="app-main">
            <Page />
          </main>
        </div>
      </ToastProvider>
    </DataProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

