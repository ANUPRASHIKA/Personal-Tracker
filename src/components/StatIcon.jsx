// Colorful rounded icon badge used atop stat cards; `color` should be a hex string (e.g. '#8b5cf6').
export default function StatIcon({ icon: Icon, color = '#8b5cf6' }) {
  return (
    <span className="stat-icon" style={{ background: `${color}22`, color }}>
      <Icon size={18} />
    </span>
  );
}
