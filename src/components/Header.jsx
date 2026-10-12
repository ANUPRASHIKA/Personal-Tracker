import { useState } from 'react';
import { LayoutDashboard, Clock, Wallet, CalendarRange, BarChart3, Settings as SettingsIcon, LogOut, Sun, Moon, Calculator as CalculatorIcon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import Calculator from './Calculator';

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: '#8b5cf6' },
  { key: 'shift', label: 'Shift Log', icon: Clock, color: '#ec4899' },
  { key: 'commute', label: 'Expense Log', icon: Wallet, color: '#22d3ee' },
  { key: 'leave', label: 'Leave & WFH', icon: CalendarRange, color: '#30e0c8' },
  { key: 'reports', label: 'Reports', icon: BarChart3, color: '#ffb020' },
  { key: 'settings', label: 'Settings', icon: SettingsIcon, color: '#94a3b8' },
];

export default function Header({ activeTab, onChangeTab, user, onSignOut }) {
  const { theme, toggleTheme } = useTheme();
  const [showCalc, setShowCalc] = useState(false);
  return (
    <aside className="app-sidebar">
      <div className="brand">
        <span className="brand-dot"></span>
        Personal Tracker
        <button className="theme-toggle" onClick={() => setShowCalc(v => !v)} title="Quick calculator">
          <CalculatorIcon size={15} />
        </button>
        <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        {showCalc && (
          <div className="calc-popover">
            <Calculator />
          </div>
        )}
      </div>
      <nav className="tabs">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              className={`tab-btn${activeTab === t.key ? ' active' : ''}`}
              onClick={() => onChangeTab(t.key)}
            >
              <Icon size={21} color={t.color} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </nav>
      {user && (
        <div className="user-menu">
          <span className="user-name">{user.displayName || user.email}</span>
          <button className="btn btn-small btn-secondary" onClick={onSignOut}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      )}
    </aside>
  );
}
