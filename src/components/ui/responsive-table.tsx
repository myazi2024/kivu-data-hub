import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveTableHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveTableBodyProps {
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveTableRowProps {
  children: React.ReactNode;
  className?: string;
  priority?: 'high' | 'medium' | 'low'; // Pour prioriser les colonnes sur mobile
}

interface ResponsiveTableCellProps {
  children: React.ReactNode;
  className?: string;
  priority?: 'high' | 'medium' | 'low';
  label?: string; // Label pour l'affichage mobile
}

const ResponsiveTable: React.FC<ResponsiveTableProps> = ({ 
  children, 
  className 
}) => (
  <div className={cn("table-responsive rounded-md border", className)}>
    <table className="w-full caption-bottom text-sm">
      {children}
    </table>
  </div>
);

const ResponsiveTableHeader: React.FC<ResponsiveTableHeaderProps> = ({ 
  children, 
  className 
}) => (
  <thead className={cn("[&_tr]:border-b", className)}>
    {children}
  </thead>
);

const ResponsiveTableBody: React.FC<ResponsiveTableBodyProps> = ({ 
  children, 
  className 
}) => (
  <tbody className={cn("[&_tr:last-child]:border-0", className)}>
    {children}
  </tbody>
);

const ResponsiveTableRow: React.FC<ResponsiveTableRowProps> = ({ 
  children, 
  className 
}) => (
  <tr className={cn(
    "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
    "md:table-row", // Normal table row sur desktop
    "block border-b-2 border-muted mb-4 pb-4 md:mb-0 md:pb-0 md:border-b", // Block layout sur mobile
    className
  )}>
    {children}
  </tr>
);

const ResponsiveTableCell: React.FC<ResponsiveTableCellProps> = ({ 
  children, 
  className, 
  priority = 'medium',
  label 
}) => (
  <td className={cn(
    "p-2 md:p-4 align-middle [&:has([role=checkbox])]:pr-0",
    // Mobile: block layout avec labels
    "block md:table-cell",
    "before:content-[attr(data-label)':'] before:font-semibold before:mr-2 md:before:content-none",
    // Priorisation des colonnes sur mobile
    priority === 'high' && "order-1",
    priority === 'medium' && "order-2", 
    priority === 'low' && "hidden sm:block order-3",
    className
  )}
  data-label={label}
>
    <span className="block md:inline">
      {children}
    </span>
  </td>
);

const ResponsiveTableHead: React.FC<ResponsiveTableCellProps> = ({ 
  children, 
  className,
  priority = 'medium'
}) => (
  <th className={cn(
    "h-10 px-2 md:px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
    // Masquer les en-têtes de colonnes non prioritaires sur mobile
    priority === 'low' && "hidden md:table-cell",
    className
  )}>
    {children}
  </th>
);

export {
  ResponsiveTable,
  ResponsiveTableHeader,
  ResponsiveTableBody,
  ResponsiveTableRow,
  ResponsiveTableCell,
  ResponsiveTableHead,
};