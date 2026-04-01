import React from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── SectionCard ─── */
interface SectionCardProps {
  number: number;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const SectionCard: React.FC<SectionCardProps> = ({ number, icon, title, children, className }) => (
  <section className={cn('relative rounded-lg border border-border/60 bg-card overflow-hidden print:border print:border-border print:rounded-none print:shadow-none', className)}>
    <div className="border-l-4 border-l-primary">
      <div className="flex items-center gap-2.5 px-5 py-3 bg-muted/30 border-b border-border/40 print:bg-muted/20">
        <span className="flex items-center justify-center w-6 h-6 rounded-md bg-primary text-primary-foreground text-xs font-bold shrink-0">
          {number}
        </span>
        <span className="text-primary">{icon}</span>
        <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  </section>
);

/* ─── DataField ─── */
interface DataFieldProps {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
  mono?: boolean;
}

export const DataField: React.FC<DataFieldProps> = ({ label, value, highlight, mono }) => (
  <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-3 py-1.5 border-b border-border/30 last:border-0">
    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider shrink-0 sm:w-40">{label}</dt>
    <dd className={cn(
      'text-sm',
      highlight && 'font-semibold text-primary',
      mono && 'font-mono text-xs',
      !highlight && !mono && 'text-foreground'
    )}>
      {value || '—'}
    </dd>
  </div>
);

/* ─── DataGrid: wraps multiple DataFields in a responsive grid ─── */
export const DataGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <dl className="divide-y divide-border/20">{children}</dl>
);

/* ─── DocTable ─── */
interface DocTableProps {
  headers: string[];
  children: React.ReactNode;
}

export const DocTable: React.FC<DocTableProps> = ({ headers, children }) => (
  <div className="overflow-x-auto -mx-1">
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th key={i} className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b-2 border-border bg-muted/30 print:bg-muted/20">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="[&>tr]:border-b [&>tr]:border-border/30 [&>tr:hover]:bg-muted/10 [&>tr>td]:px-3 [&>tr>td]:py-2 [&>tr>td]:align-top">
        {children}
      </tbody>
    </table>
  </div>
);

/* ─── LockedSection ─── */
interface LockedSectionProps {
  serviceName: string;
  onUnlock?: () => void;
}

export const LockedSection: React.FC<LockedSectionProps> = ({ serviceName, onUnlock }) => (
  <div className="py-6 px-4 rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/10 text-center space-y-3">
    <div className="mx-auto w-10 h-10 rounded-full bg-muted flex items-center justify-center">
      <Lock className="h-4 w-4 text-muted-foreground" />
    </div>
    <p className="text-sm text-muted-foreground">
      Section « <span className="font-semibold">{serviceName}</span> » non incluse dans votre achat
    </p>
    {onUnlock && (
      <Button variant="outline" size="sm" onClick={onUnlock} className="text-xs">
        <CreditCard className="h-3 w-3 mr-1.5" />
        Débloquer ce service
      </Button>
    )}
  </div>
);

/* ─── StatusAlert ─── */
interface StatusAlertProps {
  variant: 'success' | 'warning' | 'danger';
  icon: React.ReactNode;
  title: string;
  description?: string;
}

const alertStyles = {
  success: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300',
  warning: 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
  danger: 'border-destructive/30 bg-destructive/5 text-destructive',
};

export const StatusAlert: React.FC<StatusAlertProps> = ({ variant, icon, title, description }) => (
  <div className={cn('flex items-center gap-3 p-3.5 rounded-lg border', alertStyles[variant])}>
    <div className="shrink-0">{icon}</div>
    <div>
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="text-xs mt-0.5 opacity-80">{description}</p>}
    </div>
  </div>
);
