import { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

export interface CatalogSelectionRowProps {
  title: string;
  icon: ReactNode;
  selected: boolean;
  expanded: boolean;
  available?: boolean;
  disabled?: boolean;
  priceLabel: string;
  annotation?: ReactNode;
  status?: ReactNode;
  onSelect: () => void;
  onExpand: () => void;
  children?: ReactNode;
}

export default function CatalogSelectionRow({ title, icon, selected, expanded, available = true, disabled = false, priceLabel, annotation, status, onSelect, onExpand, children }: CatalogSelectionRowProps) {
  return (
    <div onClick={() => { if (!disabled) onSelect(); }} className={`transition-all duration-200 cursor-pointer ${available ? 'rounded-2xl border-2 shadow-md hover:shadow-lg' : 'rounded-xl border'} ${selected ? 'border-primary bg-primary/5' : available ? 'border-primary/40 bg-background hover:border-primary/60' : 'border-border/50 bg-muted/20'} ${disabled ? 'cursor-not-allowed' : ''}`}>
      <div className={`flex items-center gap-2 ${available ? 'p-3' : 'p-2'}`}>
        <div className={`shrink-0 transition-colors ${available ? 'p-2 rounded-xl' : 'p-1.5 rounded-lg'} ${selected ? 'bg-primary text-primary-foreground' : available ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground/50'}`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5"><h4 title={title} className={`truncate font-medium leading-tight ${available ? 'text-sm text-foreground' : 'text-xs text-muted-foreground'}`}>{title}</h4>{annotation}</div>
          {status}
        </div>
        <Button variant="ghost" size="sm" aria-label={`Détails : ${title}`} aria-expanded={expanded} onClick={e => { e.stopPropagation(); onExpand(); }} className={`shrink-0 p-0 rounded-lg ${available ? 'h-7 w-7' : 'h-6 w-6'}`}>
          <ChevronDown className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''} ${available ? 'h-4 w-4' : 'h-3.5 w-3.5'}`} />
        </Button>
        <Badge variant={available ? 'default' : 'secondary'} className={`shrink-0 whitespace-nowrap ${available ? 'text-sm px-2 py-0.5 font-semibold' : 'text-xs px-1.5 py-0.5 opacity-60'}`}>{priceLabel}</Badge>
        <Checkbox aria-label={title} checked={selected} disabled={disabled} onClick={e => e.stopPropagation()} onCheckedChange={() => { if (!disabled) onSelect(); }} className={`shrink-0 ${available ? 'h-5 w-5' : 'h-4 w-4 opacity-50'}`} />
      </div>
      {children}
    </div>
  );
}