import { useState } from 'react';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import ShiftLog from './pages/ShiftLog';
import CommuteLog from './pages/CommuteLog';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import { DataProvider } from './context/DataContext';
import { ToastProvider } from './context/ToastContext';

const PAGES = {
  dashboard: Dashboard,
  shift: ShiftLog,
  commute: CommuteLog,
  reports: Reports,
  settings: Settings,
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const Page = PAGES[activeTab];

  return (
    <DataProvider>
      <ToastProvider>
        <div className="app">
          <Header activeTab={activeTab} onChangeTab={setActiveTab} />
          <main className="app-main">
            <Page />
          </main>
        </div>
      </ToastProvider>
    </DataProvider>
  );
}

