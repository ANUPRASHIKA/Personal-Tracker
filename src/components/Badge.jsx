export default function Badge({ cls, children }) {
  return <span className={`badge ${cls || 'badge-neutral'}`}>{children}</span>;
}
