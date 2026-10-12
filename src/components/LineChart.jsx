// Smooth line/area chart, drop-in compatible with BarChart's `bars: [{ label, value, title, colorClass }]` prop.
export default function LineChart({ bars, height = 140 }) {
  const width = 600;
  const padding = 16;
  const max = Math.max(1, ...bars.map(b => b.value));
  const stepX = bars.length > 1 ? (width - padding * 2) / (bars.length - 1) : 0;

  const points = bars.map((b, i) => ({
    ...b,
    x: padding + i * stepX,
    y: padding + (1 - b.value / max) * (height - padding * 2),
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const last = points[points.length - 1];
  const first = points[0];
  const areaPath = points.length
    ? `${linePath} L ${last.x} ${height - padding} L ${first.x} ${height - padding} Z`
    : '';

  return (
    <div className="line-chart">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="line-chart-svg">
        {areaPath && <path d={areaPath} className="line-chart-area" />}
        {linePath && <path d={linePath} className="line-chart-line" fill="none" />}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" className={`line-chart-dot ${p.colorClass || ''}`}>
            <title>{p.title}</title>
          </circle>
        ))}
      </svg>
      <div className="line-chart-labels">
        {bars.map((b, i) => <span key={i}>{b.label}</span>)}
      </div>
    </div>
  );
}
