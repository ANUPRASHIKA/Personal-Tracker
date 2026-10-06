const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'shift', label: 'Shift Log' },
  { key: 'commute', label: 'Commute Log' },
  { key: 'leave', label: 'Leave & WFH' },
  { key: 'reports', label: 'Reports' },
  { key: 'settings', label: 'Settings' },
];

export default function Header({ activeTab, onChangeTab, user, onSignOut }) {
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
      {user && (
        <div className="user-menu">
          <span className="user-name">{user.displayName || user.email}</span>
          <button className="btn btn-small btn-secondary" onClick={onSignOut}>Sign out</button>
        </div>
      )}
    </header>
  );
}
