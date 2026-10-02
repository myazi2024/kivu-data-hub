import { format } from 'date-fns';

export interface CSVExportOptions {
  filename?: string;
  headers: string[];
  data: any[][];
}

/**
 * Neutralise les formules tableur (injection CSV) : une cellule texte commençant
 * par = + - @ tabulation ou retour chariot est préfixée d'une apostrophe.
 * Les nombres (ex. -12.5) restent inchangés.
 */
export const sanitizeCsvCell = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return String(value);
  const s = String(value);
  if (/^-?\d+([.,]\d+)?$/.test(s)) return s;
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
};

/**
 * Exports data to CSV format and triggers download
 */
export const exportToCSV = ({ filename, headers, data }: CSVExportOptions): void => {
  const csvContent = [
    headers.join(','),
    ...data.map(row => row.map(cell => {
      // Handle cells with commas or quotes
      const cellStr = sanitizeCsvCell(cell);
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

/**
 * Export an array of records to CSV by extracting specified fields.
 */
export const exportRecordsToCSV = (records: any[], filename: string, fields: string[]): void => {
  exportToCSV({
    filename: `${filename}.csv`,
    headers: fields,
    data: records.map(r => fields.map(f => r[f] ?? '')),
  });
};
