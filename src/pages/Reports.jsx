import { useState } from 'react';
import WeeklyReport from './WeeklyReport';
import MonthlyReport from './MonthlyReport';

export default function Reports() {
  const [subtab, setSubtab] = useState('weekly');

  return (
    <section>
      <nav className="subtabs">
        <button className={`subtab-btn${subtab === 'weekly' ? ' active' : ''}`} onClick={() => setSubtab('weekly')}>Weekly Report</button>
        <button className={`subtab-btn${subtab === 'monthly' ? ' active' : ''}`} onClick={() => setSubtab('monthly')}>Monthly Report</button>
      </nav>
      {subtab === 'weekly' ? <WeeklyReport /> : <MonthlyReport />}
    </section>
  );
}
