"use client";

import React from 'react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
}

interface AdminTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
}

export const AdminTable = <T extends { id: string | number }>({ 
  columns, 
  data, 
  loading, 
  onRowClick,
  emptyMessage = 'No data found'
}: AdminTableProps<T>) => {
  return (
    <div className="admin-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead>
            <tr>
              {columns.map((column, i) => (
                <th key={i} className={`admin-table-header ${column.className || ''}`}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map((_, j) => (
                    <td key={j} className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-slate-100 rounded w-full"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-sm text-slate-500 italic">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr 
                  key={item.id} 
                  className={`admin-table-row ${onRowClick ? 'cursor-pointer hover:bg-slate-50' : ''}`}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((column, i) => (
                    <td key={i} className={`px-6 py-4 whitespace-nowrap text-sm text-slate-700 ${column.className || ''}`}>
                      {typeof column.accessor === 'function' 
                        ? column.accessor(item) 
                        : (item[column.accessor] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const StatusBadge = ({ status }: { status: string }) => {
  const getStyles = (s: string) => {
    const raw = s.toLowerCase();
    if (raw.includes('active') || raw.includes('completed') || raw.includes('success')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    if (raw.includes('pending') || raw.includes('processing')) {
      return 'bg-amber-100 text-amber-800 border-amber-200';
    }
    if (raw.includes('failed') || raw.includes('suspended') || raw.includes('inactive')) {
      return 'bg-rose-100 text-rose-800 border-rose-200';
    }
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStyles(status)}`}>
      {status}
    </span>
  );
};
