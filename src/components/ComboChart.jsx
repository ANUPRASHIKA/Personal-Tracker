// Bar chart with a dashed average-reference line overlay. Drop-in compatible with
// BarChart/LineChart's `bars: [{ label, value, title, colorClass }]` prop.
export default function ComboChart({ bars, height = 140, lineLabel = 'Avg' }) {
  const width = 600;
  const padding = 16;
  const max = Math.max(1, ...bars.map(b => b.value));
  const n = Math.max(1, bars.length);
  const slot = (width - padding * 2) / n;
  const barWidth = Math.min(32, slot * 0.55);

  const values = bars.map(b => b.value).filter(v => v > 0);
  const avg = values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
  const lineY = padding + (1 - avg / max) * (height - padding * 2);

  return (
    <div className="combo-chart">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="combo-chart-svg">
        {bars.map((b, i) => {
          const cx = padding + slot * i + slot / 2;
          const barHeight = b.value ? Math.max(3, (b.value / max) * (height - padding * 2)) : 0;
          const y = height - padding - barHeight;
          return (
            <rect
              key={i}
              x={cx - barWidth / 2} y={y} width={barWidth} height={barHeight}
              rx="3" className={`combo-chart-bar ${b.colorClass || ''}`}
            >
              <title>{b.title}</title>
            </rect>
          );
        })}
        {avg > 0 && (
          <>
            <line x1={padding} y1={lineY} x2={width - padding} y2={lineY} className="combo-chart-line" />
            <text x={width - padding} y={Math.max(10, lineY - 5)} textAnchor="end" className="combo-chart-line-label">
              {lineLabel}: {avg.toFixed(1)}
            </text>
          </>
        )}
      </svg>
      <div className="combo-chart-labels">
        {bars.map((b, i) => <span key={i}>{b.label}</span>)}
      </div>
    </div>
  );
}
