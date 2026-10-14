import { useState } from 'react';
import { BarChart3, Gauge } from 'lucide-react';
import CatalogSelectionRow from '@/components/shared/CatalogSelectionRow';
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
  const [expanded, setExpanded] = useState(false);
  const Icon = item.kind === 'Indicateur' ? Gauge : BarChart3;
  return (
    <CatalogSelectionRow title={item.title} icon={<Icon className="h-4 w-4" aria-hidden="true" />} selected={selected || owned} expanded={expanded} disabled={owned} priceLabel={priceLabel} onSelect={onToggle} onExpand={() => setExpanded(!expanded)} status={owned ? <span className="text-[10px] text-primary font-medium">✓ Déjà acheté</span> : null}>
      <Collapsible open={expanded}>
      <CollapsibleContent className="px-3 pb-3">
        <div className="space-y-1 border-t border-border pt-2 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{item.title}</p>
          <p>{item.kind}</p>
          {item.description && <p>{item.description}</p>}
          <p>Accès {item.days} jours{owned && expiry ? ` · acquis jusqu’au ${new Date(expiry).toLocaleDateString('fr-FR')}` : ''}</p>
        </div>
      </CollapsibleContent>
      </Collapsible>
    </CatalogSelectionRow>
  );
}