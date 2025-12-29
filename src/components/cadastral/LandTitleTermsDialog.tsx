import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  Shield, 
  Clock, 
  AlertTriangle, 
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

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
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setTermsAccepted(false);
      setHasScrolledToBottom(false);
    }
  }, [open]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
    if (isAtBottom) {
      setHasScrolledToBottom(true);
    }
  };

  const handleAccept = () => {
    onOpenChange(false);
    onAccept();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-5 w-5 text-primary" />
            Demande de Titre Foncier
          </DialogTitle>
          <DialogDescription>
            Veuillez lire attentivement les conditions avant de continuer
          </DialogDescription>
        </DialogHeader>

        <ScrollArea 
          className="h-[400px] px-6"
          onScrollCapture={handleScroll}
          ref={scrollRef}
        >
          <div className="py-4 space-y-6">
            {/* Introduction */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Bienvenue</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ce service vous permet de soumettre une demande de titre foncier 
                auprès des autorités compétentes de la RDC. Votre demande sera 
                traitée selon les procédures légales en vigueur.
              </p>
            </div>

            {/* Points clés */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Points importants</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Clock className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Délai de traitement</p>
                    <p className="text-xs text-muted-foreground">
                      Le traitement peut prendre 30 à 90 jours selon la complexité du dossier.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Documents requis</p>
                    <p className="text-xs text-muted-foreground">
                      Pièce d'identité, preuve de propriété et documents du terrain.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Frais applicables</p>
                    <p className="text-xs text-muted-foreground">
                      Des frais administratifs seront calculés selon le type de titre demandé.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Conditions d'utilisation */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Conditions d'utilisation</h3>
              <div className="text-sm text-muted-foreground space-y-2 leading-relaxed">
                <p>
                  En utilisant ce service, vous acceptez les conditions suivantes :
                </p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li>Fournir des informations exactes et vérifiables</li>
                  <li>Soumettre uniquement des documents authentiques</li>
                  <li>Respecter les lois foncières de la RDC</li>
                  <li>Payer les frais requis dans les délais impartis</li>
                </ul>
              </div>
            </div>

            {/* Avertissement */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Avertissement légal</h3>
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Toute fausse déclaration ou falsification de documents est 
                  passible de poursuites judiciaires conformément au Code pénal 
                  congolais. Les demandes frauduleuses seront signalées aux autorités.
                </p>
              </div>
            </div>

            {/* Protection des données */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Protection des données</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Vos données personnelles sont traitées de manière confidentielle 
                et sécurisée. Elles ne seront partagées qu'avec les autorités 
                compétentes dans le cadre du traitement de votre demande.
              </p>
            </div>

            {/* Spacer pour permettre le scroll */}
            <div className="h-4" />
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 pt-4 border-t bg-muted/30">
          <div className="w-full space-y-4">
            {/* Checkbox */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                disabled={!hasScrolledToBottom}
                className="mt-0.5"
              />
              <label 
                htmlFor="terms" 
                className={`text-sm leading-relaxed cursor-pointer ${
                  !hasScrolledToBottom ? 'text-muted-foreground' : 'text-foreground'
                }`}
              >
                J'ai lu et j'accepte les conditions d'utilisation
              </label>
            </div>

            {!hasScrolledToBottom && (
              <p className="text-xs text-muted-foreground text-center">
                Veuillez faire défiler jusqu'en bas pour accepter
              </p>
            )}

            {/* Boutons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={handleAccept}
                disabled={!termsAccepted}
                className="flex-1 gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Accepter et continuer
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LandTitleTermsDialog;
