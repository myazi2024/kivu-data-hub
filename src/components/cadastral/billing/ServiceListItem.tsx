import React from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import type { CadastralService } from '@/hooks/useCadastralServices';

interface ServiceListItemProps {
  service: CadastralService;
  Icon: React.ComponentType<{ className?: string }>;
  isSelected: boolean;
  isExpanded: boolean;
  hasData: boolean;
  isAlreadyPaid: boolean;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
  onRequestContribution?: () => void;
}

const ServiceListItem: React.FC<ServiceListItemProps> = ({
  service,
  Icon,
  isSelected,
  isExpanded,
  hasData,
  isAlreadyPaid,
  onToggleSelect,
  onToggleExpand,
  onRequestContribution,
}) => {
  const isDisabled = !hasData || isAlreadyPaid;

  return (
    <div
      onClick={() => !isDisabled && onToggleSelect()}
      className={`
        transition-all duration-200 cursor-pointer
        ${hasData ? 'rounded-2xl border-2 shadow-md hover:shadow-lg' : 'rounded-xl border'}
        ${isSelected
          ? 'border-primary bg-primary/5'
          : hasData
            ? 'border-primary/40 bg-background hover:border-primary/60'
            : 'border-border/50 bg-muted/20'}
        ${isDisabled ? 'cursor-not-allowed' : ''}
      `}
    >
      <div className={`flex items-center gap-2 ${hasData ? 'p-3' : 'p-2'}`}>
        <div className={`
          shrink-0 transition-colors
          ${hasData ? 'p-2 rounded-xl' : 'p-1.5 rounded-lg'}
          ${isSelected
            ? 'bg-primary text-primary-foreground'
            : hasData
              ? 'bg-primary/10 text-primary'
              : 'bg-muted text-muted-foreground/50'}
        `}>
          <Icon className={hasData ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className={`
            font-medium leading-tight truncate
            ${hasData ? 'text-sm text-foreground' : 'text-xs text-muted-foreground'}
          `}>
            {service.name}
          </h4>
          {isAlreadyPaid ? (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">✓ Déjà acheté</span>
          ) : !hasData ? (
            <span className="text-[10px] text-muted-foreground/60">Données manquantes</span>
          ) : null}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          className={`p-0 rounded-lg ${hasData ? 'h-7 w-7' : 'h-6 w-6'}`}
        >
          <ChevronDown className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''} ${hasData ? 'h-4 w-4' : 'h-3.5 w-3.5'}`} />
        </Button>

        <Badge
          variant={hasData ? 'default' : 'secondary'}
          className={`shrink-0 ${hasData ? 'text-sm px-2 py-0.5 font-semibold' : 'text-xs px-1.5 py-0.5 opacity-60'}`}
        >
          ${service.price.toFixed(2)}
        </Badge>

        <Checkbox
          checked={isSelected}
          disabled={isDisabled}
          className={`pointer-events-none ${hasData ? 'h-5 w-5' : 'h-4 w-4 opacity-50'}`}
        />
      </div>

      <Collapsible open={isExpanded}>
        <CollapsibleContent className={hasData ? 'px-3 pb-3' : 'px-2.5 pb-2.5'}>
          <div className="space-y-1.5 text-left pt-1 border-t border-border/50">
            <p className={`leading-relaxed ${hasData ? 'text-sm text-muted-foreground' : 'text-xs text-muted-foreground/70'}`}>
              {service.description}
            </p>
            {!hasData && !isAlreadyPaid && onRequestContribution && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onRequestContribution();
                }}
                size="sm"
                variant="outline"
                className="w-full h-7 text-xs rounded-lg"
              >
                Compléter les données
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default ServiceListItem;
