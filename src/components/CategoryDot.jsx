import { CATEGORY_DOT_COLORS } from '../lib/commute';

export default function CategoryDot({ label }) {
  const color = CATEGORY_DOT_COLORS[label] || '#9aa4b2';
  return (
    <>
      <span className="category-dot" style={{ background: color }}></span>
      {label}
    </>
  );
}
