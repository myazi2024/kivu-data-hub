import React from 'react';
import { Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface LockedFieldWrapperProps {
  children: React.ReactElement;
  isLocked: boolean;
  fieldKey: string;
}

/**
 * Wrapper pour afficher visuellement les champs verrouillés dans le formulaire CCC
 */
const LockedFieldWrapper: React.FC<LockedFieldWrapperProps> = ({ children, isLocked, fieldKey }) => {
  if (!isLocked) {
    return children;
  }

  // Cloner l'enfant en ajoutant les props de verrouillage
  const lockedChild = React.cloneElement(children, {
    disabled: true,
    className: `${children.props.className || ''} opacity-50 cursor-not-allowed bg-muted/50`,
  });

  return (
    <TooltipProvider>
      <div className="relative">
        <div className="pointer-events-none opacity-60">
          {lockedChild}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="secondary"
              className="absolute top-2 right-2 text-xs gap-1 bg-muted border border-border pointer-events-auto"
            >
              <Lock className="h-3 w-3" />
              Verrouillé
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs">
            <p className="text-xs">
              Ce champ est verrouillé car vous contribuez uniquement à certains champs spécifiques.
              Pour modifier ce champ, utilisez le bouton "Ajouter" dans les résultats cadastraux.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

export default LockedFieldWrapper;
