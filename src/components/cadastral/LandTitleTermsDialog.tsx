import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  FileText, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  ArrowRight,
  Shield,
  Lock,
  MessageCircle
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';

interface LandTitleTermsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
}

const LandTitleTermsDialog: React.FC<LandTitleTermsDialogProps> = ({
  open,
  onOpenChange,
  onAccept,
}) => {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setHasScrolledToBottom(false);
      const timer = setTimeout(() => {
        setHasScrolledToBottom(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isAtBottom = Math.abs(element.scrollHeight - element.scrollTop - element.clientHeight) < 50;
    
    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  const handleAccept = () => {
    onOpenChange(false);
    onAccept();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[340px] max-h-[85vh] overflow-hidden p-0 rounded-2xl z-[9999]">
        <div className="px-4 pt-8 pb-2">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-bold text-center text-primary">
              Demande de Titre Foncier
            </DialogTitle>
            <p className="text-sm text-muted-foreground text-center">
              Veuillez lire attentivement avant de continuer
            </p>
          </DialogHeader>
        </div>

        <div 
          ref={contentRef}
          onScroll={handleScroll}
          className="space-y-2.5 px-3 pb-28 overflow-y-auto max-h-[calc(90vh-180px)]"
        >
          {/* Introduction */}
          <Card className="p-3 rounded-xl border-primary/20 bg-primary/5 shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-primary/20 rounded-lg flex-shrink-0">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1">À propos du service</h3>
                <p className="text-sm leading-relaxed text-foreground/80">
                  Ce service permet de soumettre une <strong className="text-foreground">demande de titre foncier</strong> auprès des autorités de la RDC selon les procédures légales.
                </p>
              </div>
            </div>
          </Card>

          {/* Délai de traitement */}
          <Card className="p-3 rounded-xl border-blue-500/20 bg-blue-500/5 shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-blue-500/20 rounded-lg flex-shrink-0">
                <Clock className="h-4 w-4 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1">Délai de traitement</h3>
                <p className="text-sm leading-relaxed text-foreground/80">
                  Votre demande sera traitée dans un délai de <strong className="text-foreground">30 à 90 jours</strong> selon la complexité du dossier.
                </p>
              </div>
            </div>
          </Card>

          {/* Documents requis */}
          <Card className="p-3 rounded-xl border-green-500/20 bg-green-500/5 shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-green-500/20 rounded-lg flex-shrink-0">
                <Shield className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-2">Documents requis</h3>
                <div className="space-y-1.5 text-sm text-foreground/80">
                  <div className="flex items-start gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-foreground">Pièce d'identité</strong> du demandeur</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-foreground">Preuve de propriété</strong> ou d'occupation</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-foreground">Documents terrain</strong> (croquis, PV bornage)</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Conditions */}
          <Card className="p-3 rounded-xl border-accent/20 bg-accent/5 shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-accent/20 rounded-lg flex-shrink-0">
                <Lock className="h-4 w-4 text-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-2">Conditions d'utilisation</h3>
                <div className="space-y-1.5 text-sm text-foreground/80">
                  <div className="flex items-start gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Fournir des <strong className="text-foreground">informations exactes</strong></span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Soumettre des <strong className="text-foreground">documents authentiques</strong></span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Respecter les <strong className="text-foreground">lois foncières RDC</strong></span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Payer les <strong className="text-foreground">frais dans les délais</strong></span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Avertissement légal */}
          <Card className="p-3 rounded-xl border-destructive/30 bg-destructive/5 shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-destructive/20 rounded-lg flex-shrink-0">
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1 text-destructive">Avertissement légal</h3>
                <p className="text-sm leading-relaxed text-foreground/80">
                  Toute <strong className="text-foreground">fausse déclaration</strong> est passible de poursuites conformément au Code pénal congolais.
                </p>
              </div>
            </div>
          </Card>

          {/* Assistance */}
          <Card className="p-3 rounded-xl border-blue-500/20 bg-blue-500/5 shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-blue-500/20 rounded-lg flex-shrink-0">
                <MessageCircle className="h-4 w-4 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-2">Assistance disponible</h3>
                <div className="space-y-1.5 text-sm text-foreground/80">
                  <div className="flex items-start gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                    <span><strong className="text-foreground">Bulles d'aide</strong> sur chaque champ</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <FaWhatsapp className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-foreground">Support WhatsApp</strong> 24h/24</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Bouton fixé en bas */}
        <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-background/80 backdrop-blur-sm border-t border-border/20 p-3 space-y-2 rounded-b-2xl">
          <Button 
            onClick={handleAccept}
            disabled={!hasScrolledToBottom}
            className={`w-full h-10 text-sm font-semibold rounded-xl shadow-lg transition-all duration-300 ${
              hasScrolledToBottom 
                ? 'bg-primary hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]' 
                : 'bg-muted cursor-not-allowed opacity-60'
            }`}
          >
            <span className="mr-1.5">Accepter et continuer</span>
            <ArrowRight className={`h-4 w-4 transition-transform duration-300 ${hasScrolledToBottom ? 'group-hover:translate-x-1' : ''}`} />
          </Button>
          
          {!hasScrolledToBottom && (
            <p className="text-xs text-center text-muted-foreground">
              Veuillez défiler vers le bas ou patienter 2 secondes
            </p>
          )}
          
          <p className="text-xs text-muted-foreground text-center">
            Vos données sont traitées de manière confidentielle
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LandTitleTermsDialog;
