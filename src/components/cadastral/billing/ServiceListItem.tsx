import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { trackEvent } from '@/lib/analytics';
import type { CadastralService } from '@/hooks/useCadastralServices';
import { getCadastralCategoryMeta } from '@/constants/cadastralServiceCategories';
import { useCurrencyConfig } from '@/hooks/useCurrencyConfig';
import { formatCurrency } from '@/utils/formatters';
import CatalogSelectionRow from '@/components/shared/CatalogSelectionRow';

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
  /** O1 : prix pré-formaté côté parent (évite useCurrencyConfig par item). */
  priceLabel?: string;
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
  priceLabel: priceLabelProp,
}) => {
  const isDisabled = !hasData || isAlreadyPaid;
  const viewedRef = useRef(false);

  // Track 'view' une seule fois par montage si le service est exposé à l'utilisateur
  useEffect(() => {
    if (hasData && !viewedRef.current) {
      viewedRef.current = true;
      trackEvent('cadastral_service_view', {
        service_id: service.id,
        price: service.price,
        category: service.category ?? 'consultation',
        is_already_paid: isAlreadyPaid,
      });
    }
  }, [hasData, isAlreadyPaid, service.id, service.price, service.category]);

  const handleToggleSelect = () => {
    if (isDisabled) return;
    trackEvent(isSelected ? 'cadastral_service_unselect' : 'cadastral_service_select', {
      service_id: service.id,
      price: service.price,
      category: service.category ?? 'consultation',
    });
    onToggleSelect();
  };

  const catInfo = getCadastralCategoryMeta(service.category);
  // Fallback : si le parent ne fournit pas priceLabel, on calcule localement (rétro-compat).
  const { selectedCurrency, convertFromUsd } = useCurrencyConfig();
  const priceLabel = priceLabelProp ?? formatCurrency(convertFromUsd(service.price), selectedCurrency);


  return (
    <CatalogSelectionRow
      title={service.name}
      icon={<Icon className={hasData ? 'h-4 w-4' : 'h-3.5 w-3.5'} />}
      selected={isSelected}
      expanded={isExpanded}
      available={hasData}
      disabled={isDisabled}
      priceLabel={priceLabel}
      onSelect={handleToggleSelect}
      onExpand={onToggleExpand}
      annotation={<span className={`shrink-0 hidden sm:inline-flex items-center rounded-full border px-1.5 py-0 text-[9px] font-medium leading-4 ${catInfo.className} ${hasData ? '' : 'opacity-60'}`}>{catInfo.label}</span>}
      status={isAlreadyPaid ? <span className="text-[10px] text-primary font-medium">✓ Déjà acheté</span> : !hasData ? <span className="text-[10px] text-muted-foreground/60">Données manquantes</span> : null}
    >
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
    </CatalogSelectionRow>
  );
};

export default ServiceListItem;
