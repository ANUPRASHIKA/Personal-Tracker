const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'shift', label: 'Shift Log' },
  { key: 'commute', label: 'Commute Log' },
  { key: 'reports', label: 'Reports' },
  { key: 'settings', label: 'Settings' },
];

export default function Header({ activeTab, onChangeTab }) {
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-dot"></span>
        Personal Tracker
      </div>
      <nav className="tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`tab-btn${activeTab === t.key ? ' active' : ''}`}
            onClick={() => onChangeTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
