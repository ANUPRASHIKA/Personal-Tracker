// Renders a donut chart from `segments: [{ label, value, color }]`, with an optional center label
// and a legend listing each segment's value and percentage share of the total.
export default function DonutChart({ segments, size = 130, thickness = 16, centerLabel }) {
  const total = segments.reduce((sum, s) => sum + (Number(s.value) || 0), 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2, cy = size / 2;
  let offset = 0;

  return (
    <div className="donut-chart-wrap">
      <div className="donut-chart" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="var(--surface-alt)" strokeWidth={thickness} />
          {total > 0 && segments.map((seg, i) => {
            const value = Number(seg.value) || 0;
            if (!value) return null;
            const dash = (value / total) * circumference;
            const circle = (
              <circle
                key={seg.label || i}
                cx={cx} cy={cy} r={radius}
                fill="none"
                stroke={seg.color || 'var(--accent)'}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${cx} ${cy})`}
              />
            );
            offset += dash;
            return circle;
          })}
        </svg>
        <div className="donut-center">
          <div className="donut-center-value">{total ? `₹${total}` : '–'}</div>
          {centerLabel && <div className="donut-center-label">{centerLabel}</div>}
        </div>
      </div>
      <div className="donut-legend">
        {segments.length ? segments.map((seg, i) => (
          <div className="donut-legend-row" key={seg.label || i}>
            <span className="category-dot" style={{ background: seg.color || 'var(--accent)' }}></span>
            <span className="donut-legend-label">{seg.label}</span>
            <span className="donut-legend-value">
              ₹{Number(seg.value) || 0}{total ? ` (${Math.round(((Number(seg.value) || 0) / total) * 100)}%)` : ''}
            </span>
          </div>
        )) : <p className="muted">No data yet</p>}
      </div>
    </div>
  );
}
