// Generic small bar chart used for both the hours trend and the expense trend on the dashboard.
// bars: [{ label, value, title, colorClass }]
export default function BarChart({ bars }) {
  const max = Math.max(1, ...bars.map(b => b.value));
  return (
    <div className="chart">
      {bars.map((b, i) => (
        <div className="chart-bar-wrap" key={i}>
          <div
            className={`chart-bar ${b.colorClass || ''}`}
            style={{ height: `${b.value ? Math.max(2, (b.value / max) * 100) : 0}%` }}
            title={b.title}
          ></div>
          <div className="chart-label">{b.label}</div>
        </div>
      ))}
    </div>
  );
}
