import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ContributionButtonProps {
  fieldKey: string;
  fieldLabel: string;
  onContribute: (fieldKey: string) => void;
  size?: 'sm' | 'default';
}

const ContributionButton: React.FC<ContributionButtonProps> = ({
  fieldKey,
  fieldLabel,
  onContribute,
  size = 'sm'
}) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size={size}
            onClick={() => onContribute(fieldKey)}
            className="gap-1"
          >
            <Plus className="h-3 w-3" />
            Ajouter
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Contribuer à enrichir cette donnée et obtenir une récompense</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ContributionButton;
