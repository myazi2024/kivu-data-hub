import { format } from 'date-fns';

export interface CSVExportOptions {
  filename?: string;
  headers: string[];
  data: any[][];
}

/**
 * Exports data to CSV format and triggers download
 */
export const exportToCSV = ({ filename, headers, data }: CSVExportOptions): void => {
  const csvContent = [
    headers.join(','),
    ...data.map(row => row.map(cell => {
      // Handle cells with commas or quotes
      const cellStr = String(cell ?? '');
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `export_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
