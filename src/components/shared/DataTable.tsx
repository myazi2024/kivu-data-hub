import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Download, LucideIcon } from 'lucide-react';

export interface TableColumn<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  title: string;
  icon: LucideIcon;
  data: T[];
  columns: TableColumn<T>[];
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onExport?: () => void;
  actions?: React.ReactNode;
  emptyMessage?: string;
  compact?: boolean;
}

export function DataTable<T extends { id: string }>({
  title,
  icon: Icon,
  data,
  columns,
  searchPlaceholder = 'Rechercher...',
  searchValue = '',
  onSearchChange,
  onExport,
  actions,
  emptyMessage = 'Aucune donnée trouvée',
  compact = false
}: DataTableProps<T>) {
  return (
    <Card>
      <CardHeader className={compact ? 'p-3 sm:p-6' : ''}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
            {title}
          </CardTitle>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            {onSearchChange && (
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-2 top-2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-7 sm:pl-8 h-8 sm:h-9 text-xs sm:text-sm w-full sm:w-48"
                />
              </div>
            )}
            {onExport && (
              <Button onClick={onExport} variant="outline" size="sm" className="gap-1 h-8 text-xs">
                <Download className="h-3 w-3" />
                <span className="hidden sm:inline">Exporter</span>
              </Button>
            )}
            {actions}
          </div>
        </div>
      </CardHeader>
      <CardContent className={compact ? 'p-0 sm:p-6' : ''}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                {columns.map((column, index) => (
                  <TableHead
                    key={index}
                    className={`p-2 ${column.hideOnMobile ? 'hidden sm:table-cell' : ''} ${column.className || ''}`}
                  >
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-6 text-xs text-muted-foreground">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => (
                  <TableRow key={item.id} className="text-xs">
                    {columns.map((column, colIndex) => (
                      <TableCell
                        key={colIndex}
                        className={`p-2 ${column.hideOnMobile ? 'hidden sm:table-cell' : ''} ${column.className || ''}`}
                      >
                        {typeof column.accessor === 'function'
                          ? column.accessor(item)
                          : String(item[column.accessor])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
