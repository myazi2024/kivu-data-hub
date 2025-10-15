import React from 'react';
import { Plus, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

interface CadastralFieldWithContributionProps {
  label: string;
  value: string | number | null | undefined;
  fieldKey: string;
  serviceId: string;
  isAccessGranted: boolean;
  onContribute: (serviceId: string, fieldKey: string) => void;
  className?: string;
}

/**
 * Composant pour afficher un champ cadastral avec bouton de contribution si la valeur est manquante
 */
const CadastralFieldWithContribution: React.FC<CadastralFieldWithContributionProps> = ({
  label,
  value,
  fieldKey,
  serviceId,
  isAccessGranted,
  onContribute,
  className = ''
}) => {
  const isEmpty = !value || (typeof value === 'string' && value.trim() === '');
  
  // Si l'accès n'est pas accordé, afficher verrouillé
  if (!isAccessGranted) {
    return (
      <div className={`flex items-center justify-between py-2 px-3 rounded-lg bg-muted/20 border border-dashed border-muted ${className}`}>
        <div className="flex-1">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs bg-muted/50">
            <Lock className="h-3 w-3 mr-1" />
            Verrouillé
          </Badge>
        </div>
      </div>
    );
  }

  // Si la valeur existe, afficher normalement
  if (!isEmpty) {
    return (
      <div className={`flex items-center justify-between py-2 ${className}`}>
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold text-foreground">{value}</span>
      </div>
    );
  }

  // Si la valeur est manquante, afficher avec bouton de contribution
  return (
    <TooltipProvider>
      <div className={`flex items-center justify-between py-2 px-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 ${className}`}>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-amber-900 dark:text-amber-100">{label}</span>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">Donnée manquante</p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onContribute(serviceId, fieldKey)}
              className="ml-2 h-7 px-2 text-xs border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30"
            >
              <Plus className="h-3 w-3 mr-1" />
              Ajouter
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Contribuer à enrichir cette donnée et gagner un code CCC</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

export default CadastralFieldWithContribution;
