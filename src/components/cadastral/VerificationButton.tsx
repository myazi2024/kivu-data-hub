import React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ExternalLink, Info } from 'lucide-react';

interface VerificationButtonProps {
  /** URL cible de vérification */
  verificationUrl: string;
  /** Texte de description dans le popover */
  documentType?: string;
  /** Label du bouton */
  label?: string;
}

/**
 * Bouton de vérification d'authenticité avec popover explicatif
 * Fix #10: Dédupliqué depuis CadastralResultCard (était copié ~6 fois)
 */
const VerificationButton: React.FC<VerificationButtonProps> = ({
  verificationUrl,
  documentType = 'du document',
  label
}) => {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="flex-1 h-6 text-[10px] font-medium group relative overflow-hidden bg-gradient-to-r from-primary/5 to-primary/8 hover:from-primary/10 hover:to-primary/15 border border-primary/15 hover:border-primary/25 text-primary hover:text-primary transition-all duration-300 hover:scale-[1.02] hover:shadow-sm rounded-md px-2 py-0.5"
        onClick={() => window.open(verificationUrl, '_blank')}
      >
        <ExternalLink className="h-2.5 w-2.5 mr-1 group-hover:scale-110 transition-transform duration-200" />
        <span className="hidden xs:inline">{label || 'Vérifier'}</span>
        <span className="xs:hidden">{label || 'Vérif.'}</span>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 ease-out" />
      </Button>
      
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-primary/70 hover:text-primary hover:bg-primary/10 transition-all duration-200 rounded-md"
          >
            <Info className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent side="top" className="w-72 p-3" align="end">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-primary rounded-full"></div>
              <p className="font-medium text-sm text-primary">Vérification d'authenticité</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Vérifie et consulte l'authenticité {documentType} signé 
              auprès du bureau de la circonscription foncière.
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default VerificationButton;
