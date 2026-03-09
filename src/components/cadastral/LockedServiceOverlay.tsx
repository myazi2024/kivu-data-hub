import React from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard } from 'lucide-react';

interface LockedServiceOverlayProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onUnlock: () => void;
  /** Use gradient styling for premium feel */
  premium?: boolean;
}

/**
 * Overlay réutilisable pour les services verrouillés (non payés)
 * Fix #10: Dédupliqué depuis CadastralResultCard (était copié 5 fois)
 */
const LockedServiceOverlay: React.FC<LockedServiceOverlayProps> = ({
  icon,
  title,
  description,
  onUnlock,
  premium = false
}) => {
  return (
    <div className={`p-4 text-center border-2 border-dashed rounded-lg ${
      premium 
        ? 'border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5' 
        : 'border-muted-foreground/30'
    }`}>
      <div className="space-y-3">
        <div className={`mx-auto w-12 h-12 rounded-xl flex items-center justify-center ${
          premium
            ? 'bg-gradient-to-br from-primary/10 to-secondary/10'
            : 'bg-muted rounded-full'
        }`}>
          {icon}
        </div>
        <div className="space-y-1">
          <h3 className={`text-sm font-bold ${
            premium
              ? 'bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent'
              : 'font-semibold'
          }`}>
            {title}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
        <Button 
          onClick={onUnlock}
          size="sm"
          className={`text-xs ${premium ? 'bg-gradient-to-r from-primary to-primary/80' : ''}`}
        >
          <CreditCard className="h-3 w-3 mr-1" />
          Débloquer
        </Button>
      </div>
    </div>
  );
};

export default LockedServiceOverlay;
