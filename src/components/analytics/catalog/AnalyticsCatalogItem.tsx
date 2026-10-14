import { useId, useState } from 'react';
import { BarChart3, ChevronDown, Gauge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';

export interface CatalogVisual {
  tab_key: string;
  item_key: string;
  title: string;
  kind: string;
  price_usd: number;
  days: number;
  description: string | null;
}

export default function AnalyticsCatalogItem({ item, selected, owned, expiry, priceLabel, onToggle }: {
  item: CatalogVisual; selected: boolean; owned: boolean; expiry?: string;
  priceLabel: string; onToggle: () => void;
}) {
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const Icon = item.kind === 'Indicateur' ? Gauge : BarChart3;
  return (
    <Collapsible open={expanded} onOpenChange={setExpanded} className={`rounded-2xl border-2 transition-colors ${selected ? 'border-primary bg-primary/5' : 'border-primary/30 bg-background'} ${owned ? 'border-border bg-muted/20' : ''}`}>
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 p-3 sm:flex">
        <div className={`shrink-0 rounded-xl p-2 ${selected ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}><Icon className="h-4 w-4" aria-hidden="true" /></div>
        <label htmlFor={id} className={`min-w-0 flex-1 ${owned ? '' : 'cursor-pointer'}`}>
          <span className="block break-words text-sm font-medium leading-tight text-foreground">{item.title}</span>
          <span className="text-xs text-muted-foreground">{owned ? 'Déjà acheté' : item.kind}</span>
        </label>
        <Button variant="ghost" size="icon" className="col-start-1 row-start-2 h-11 w-11 shrink-0" aria-label={`Détails : ${item.title}`} aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
          <ChevronDown aria-hidden="true" className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </Button>
        <Badge className="col-start-2 row-start-2 w-fit shrink-0 whitespace-nowrap text-xs" variant={owned ? 'secondary' : 'default'}>{priceLabel}</Badge>
        <Checkbox id={id} checked={selected || owned} disabled={owned} onCheckedChange={onToggle} aria-label={item.title} className="col-start-3 row-start-1 h-5 w-5 shrink-0" />
      </div>
      <CollapsibleContent className="px-3 pb-3">
        <div className="space-y-1 border-t border-border pt-2 text-sm text-muted-foreground">
          {item.description && <p>{item.description}</p>}
          <p>Accès {item.days} jours{owned && expiry ? ` · acquis jusqu’au ${new Date(expiry).toLocaleDateString('fr-FR')}` : ''}</p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}