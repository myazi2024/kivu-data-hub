import React from 'react';
import { Badge } from '@/components/ui/badge';

/** Bordered summary row (for identification sections) */
export const SummaryRow: React.FC<{ label: string; value: string; bold?: boolean; mono?: boolean }> = ({ label, value, bold, mono }) => (
  <div className="flex justify-between py-1.5 border-b border-border/50">
    <span className="text-muted-foreground">{label}</span>
    <span className={`${bold ? 'font-bold' : 'font-medium'} ${mono ? 'font-mono' : ''}`}>{value}</span>
  </div>
);

/** Plain row (no border) */
export const PlainRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span>{value}</span>
  </div>
);
