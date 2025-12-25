import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Clock, FileText, MessageCircle, CheckCircle, ArrowRight, Smartphone } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';

interface CCCIntroDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
  parcelNumber: string;
}

const CCCIntroDialog = ({ open, onOpenChange, onContinue }: CCCIntroDialogProps) => {
  const [hasScrolledToBottom, setHasScrolledToBottom] = React.useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (open) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[320px] max-h-[85vh] overflow-hidden p-0 rounded-2xl z-[9999]">
        <div className="px-4 pt-4 pb-2">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-bold text-center text-primary leading-tight">
              Ajouter parcelle au cadastre numérique de la République Démocratique du Congo
            </DialogTitle>
            <p className="text-sm text-muted-foreground text-center">
              À lire avant de commencer
            </p>
          </DialogHeader>
        </div>

        <div 
          ref={contentRef}
          onScroll={handleScroll}
          className="space-y-2.5 px-3 pb-28 overflow-y-auto max-h-[calc(90vh-180px)]"
        >
          {/* Temps estimé */}
          <Card className="p-3 rounded-xl border-primary/20 bg-primary/5 shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-primary/20 rounded-lg flex-shrink-0">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1">Rapide et simple</h3>
                <p className="text-sm leading-relaxed text-foreground/80">
                  <strong className="text-foreground">3 à 5 min</strong> suffisent. Sauvegardez votre progression à tout moment.
                </p>
              </div>
            </div>
          </Card>

          {/* Appareil recommandé */}
          <Card className="p-3 rounded-xl border-green-500/20 bg-green-500/5 shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-green-500/20 rounded-lg flex-shrink-0">
                <Smartphone className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1">Idéal sur téléphone</h3>
                <p className="text-sm leading-relaxed text-foreground/80">
                  Photographiez et ajoutez vos <strong className="text-foreground">documents facilement</strong>.
                </p>
              </div>
            </div>
          </Card>

          {/* Type d'informations */}
          <Card className="p-3 rounded-xl border-accent/20 bg-accent/5 shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-accent/20 rounded-lg flex-shrink-0">
                <FileText className="h-4 w-4 text-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-2">Infos demandées</h3>
                <div className="space-y-1.5 text-sm text-foreground/80">
                  <div className="flex items-start gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-foreground">Base :</strong> N° cadastral, superficie, type</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-foreground">Lieu :</strong> Mesures des côtés, coordonnées GPS</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-foreground">Historique :</strong> Propriétaires précédents</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-foreground">Taxes :</strong> Impôts fonciers, hypothèques</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Assistance disponible */}
          <Card className="p-3 rounded-xl border-blue-500/20 bg-blue-500/5 shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-blue-500/20 rounded-lg flex-shrink-0">
                <MessageCircle className="h-4 w-4 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-2">Aide disponible</h3>
                <div className="space-y-1.5 text-sm text-foreground/80">
                  <div className="flex items-start gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                    <span><strong className="text-foreground">Bulles d'aide</strong> sur chaque champ</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                    <span><strong className="text-foreground">Notifications</strong> et conseils</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <FaWhatsapp className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-foreground">WhatsApp 24/7</strong> via bouton flottant</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Bouton fixé en bas */}
        <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-background/80 backdrop-blur-sm border-t border-border/20 p-3 space-y-2 rounded-b-2xl">
          <Button 
            onClick={onContinue}
            disabled={!hasScrolledToBottom}
            className={`w-full h-10 text-sm font-semibold rounded-xl shadow-lg transition-all duration-300 ${
              hasScrolledToBottom 
                ? 'bg-primary hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]' 
                : 'bg-muted cursor-not-allowed opacity-60'
            }`}
          >
            <span className="mr-1.5">Commencer</span>
            <ArrowRight className={`h-4 w-4 transition-transform duration-300 ${hasScrolledToBottom ? 'group-hover:translate-x-1' : ''}`} />
          </Button>
          
          {!hasScrolledToBottom && (
            <p className="text-xs text-center text-muted-foreground">
              Défiler ou attendre 2s
            </p>
          )}
          
          <p className="text-xs text-muted-foreground text-center">
            Infos vérifiées par notre équipe
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CCCIntroDialog;
