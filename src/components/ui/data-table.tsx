'use client';

import * as React from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
  hideOnMobile?: boolean;
};

export type Filter<T> = {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  value: (row: T) => string;
};

type DataTableProps<T> = {
  rows: T[];
  columns: Column<T>[];
  searchValue?: (row: T) => string;
  searchPlaceholder?: string;
  filters?: Filter<T>[];
  pageSize?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
};

/**
 * Tableau générique : recherche plein texte, filtres, tri par colonne,
 * pagination — le tout côté client, sur des données déjà filtrées par le serveur
 * selon l'organisation de l'utilisateur.
 */
export function DataTable<T>({
  rows,
  columns,
  searchValue,
  searchPlaceholder = 'Rechercher…',
  filters = [],
  pageSize = 10,
  emptyTitle = 'Aucun résultat',
  emptyDescription,
  emptyAction,
  rowKey,
  onRowClick,
}: DataTableProps<T>) {
  const [query, setQuery] = React.useState('');
  const [filterState, setFilterState] = React.useState<Record<string, string>>({});
  const [sort, setSort] = React.useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [page, setPage] = React.useState(1);

  const filtered = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesQuery = !term || !searchValue || searchValue(row).toLowerCase().includes(term);
      if (!matchesQuery) return false;
      return filters.every((filter) => {
        const value = filterState[filter.key];
        return !value || filter.value(row) === value;
      });
    });
  }, [rows, query, searchValue, filters, filterState]);

  const sorted = React.useMemo(() => {
    if (!sort) return filtered;
    const column = columns.find((c) => c.key === sort.key);
    if (!column?.sortValue) return filtered;
    const getValue = column.sortValue;
    return [...filtered].sort((a, b) => {
      const aValue = getValue(a);
      const bValue = getValue(b);
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sort.dir === 'asc' ? aValue - bValue : bValue - aValue;
      }
      return sort.dir === 'asc'
        ? String(aValue).localeCompare(String(bValue), 'fr')
        : String(bValue).localeCompare(String(aValue), 'fr');
    });
  }, [filtered, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visible = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (key: string) => {
    setSort((previous) =>
      previous?.key === key
        ? { key, dir: previous.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' },
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {searchValue ? (
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder={searchPlaceholder}
              className="pl-9"
              aria-label="Rechercher dans le tableau"
            />
          </div>
        ) : null}
        {filters.map((filter) => (
          <Select
            key={filter.key}
            aria-label={filter.label}
            className="sm:w-48"
            value={filterState[filter.key] ?? ''}
            onChange={(event) => {
              setFilterState((previous) => ({ ...previous, [filter.key]: event.target.value }));
              setPage(1);
            }}
          >
            <option value="">{filter.label} : tous</option>
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {columns.map((column) => (
                  <TableHead
                    key={column.key}
                    className={cn(column.className, column.hideOnMobile && 'hidden md:table-cell')}
                  >
                    {column.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        className="inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-foreground"
                      >
                        {column.header}
                        {sort?.key === column.key ? (
                          sort.dir === 'asc' ? (
                            <ArrowUp className="size-3" />
                          ) : (
                            <ArrowDown className="size-3" />
                          )
                        ) : null}
                      </button>
                    ) : (
                      column.header
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => (
                <TableRow
                  key={rowKey(row)}
                  className={cn(onRowClick && 'cursor-pointer')}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn(column.className, column.hideOnMobile && 'hidden md:table-cell')}
                    >
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
        <p className="text-xs text-muted-foreground">
          {sorted.length} résultat{sorted.length > 1 ? 's' : ''}
          {sorted.length > pageSize
            ? ` — page ${currentPage} sur ${totalPages}`
            : ''}
        </p>
        {sorted.length > pageSize ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="size-4" /> Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Suivant <ChevronRight className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
