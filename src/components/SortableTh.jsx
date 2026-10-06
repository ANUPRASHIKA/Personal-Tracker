export default function SortableTh({ label, sortKey, activeKey, dir, onSort }) {
  const active = sortKey === activeKey;
  return (
    <th className="sortable-th" onClick={() => onSort(sortKey)}>
      {label}{active ? (dir === 'asc' ? ' ▲' : ' ▼') : ''}
    </th>
  );
}
