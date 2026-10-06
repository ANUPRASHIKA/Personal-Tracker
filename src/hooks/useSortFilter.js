import { useMemo, useState } from 'react';

// Generic text-filter + column-sort hook for table data.
// `getSearchText` builds a lowercase haystack per row for the free-text filter.
// `sorters` maps a column key to a value-accessor used when that column header is clicked.
export function useSortFilter(rows, getSearchText, sorters = {}, initialSort = {}) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState(initialSort.key ?? null);
  const [sortDir, setSortDir] = useState(initialSort.dir ?? 'asc');

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  }

  const sortedFiltered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let out = term ? rows.filter(r => getSearchText(r).toLowerCase().includes(term)) : rows;
    const accessor = sortKey && sorters[sortKey];
    if (accessor) {
      out = [...out].sort((a, b) => {
        const av = accessor(a), bv = accessor(b);
        if (av == null && bv == null) return 0;
        if (av == null) return -1;
        if (bv == null) return 1;
        const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
        return sortDir === 'desc' ? -cmp : cmp;
      });
    }
    return out;
  }, [rows, search, sortKey, sortDir, getSearchText, sorters]);

  return { search, setSearch, sortKey, sortDir, toggleSort, rows: sortedFiltered };
}
