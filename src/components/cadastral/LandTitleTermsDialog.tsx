import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogPortal,
  DialogOverlay,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Shield, 
  Clock, 
  AlertTriangle, 
  CheckCircle2,
  ArrowRight,
  Scale,
  Lock,
  Info
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
      <DialogPortal>
        <DialogOverlay className="z-[9998]" />
        <DialogContent className="z-[9999] max-w-2xl max-h-[90vh] p-0 overflow-hidden bg-background border-border">
          {/* Header */}
          <DialogHeader className="p-4 sm:p-6 pb-4 border-b bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-semibold">
                  Demande de Titre Foncier
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Conditions d'utilisation du service
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Content */}
          <ScrollArea 
            className="h-[400px] sm:h-[450px]"
            onScrollCapture={handleScroll}
            ref={scrollRef}
          >
            <div className="p-4 sm:p-6 space-y-4">
              {/* Introduction Card */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-foreground leading-relaxed">
                      Ce service permet de soumettre une demande de titre foncier 
                      auprès des autorités de la RDC. Votre dossier sera traité 
                      selon les procédures légales en vigueur.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Points clés */}
              <div className="space-y-3">
                <h3 className="font-medium text-foreground flex items-center gap-2">
                  <Scale className="h-4 w-4 text-primary" />
                  Points essentiels
                </h3>
                <div className="grid gap-3">
                  <Card className="border-muted">
                    <CardContent className="p-3 flex items-start gap-3">
                      <div className="p-1.5 bg-blue-500/10 rounded">
                        <Clock className="h-4 w-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Délai: 30 à 90 jours</p>
                        <p className="text-xs text-muted-foreground">
                          Selon la complexité du dossier
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-muted">
                    <CardContent className="p-3 flex items-start gap-3">
                      <div className="p-1.5 bg-green-500/10 rounded">
                        <Shield className="h-4 w-4 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Documents requis</p>
                        <p className="text-xs text-muted-foreground">
                          Pièce d'identité, preuve de propriété, documents terrain
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-muted">
                    <CardContent className="p-3 flex items-start gap-3">
                      <div className="p-1.5 bg-amber-500/10 rounded">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Frais administratifs</p>
                        <p className="text-xs text-muted-foreground">
                          Calculés selon le type de titre demandé
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <Separator />

              {/* Conditions */}
              <div className="space-y-3">
                <h3 className="font-medium text-foreground">Conditions d'utilisation</h3>
                <Card className="border-muted">
                  <CardContent className="p-4">
                    <ul className="text-sm text-muted-foreground space-y-2">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        Fournir des informations exactes et vérifiables
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        Soumettre uniquement des documents authentiques
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        Respecter les lois foncières de la RDC
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        Payer les frais requis dans les délais
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Avertissement */}
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-destructive">Avertissement légal</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Toute fausse déclaration est passible de poursuites 
                        conformément au Code pénal congolais.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Protection des données */}
              <Card className="border-muted">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Lock className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Protection des données</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Vos données sont traitées de manière confidentielle 
                        et partagées uniquement avec les autorités compétentes.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Spacer */}
              <div className="h-4" />
            </div>
          </ScrollArea>

          {/* Footer */}
          <DialogFooter className="p-4 sm:p-6 pt-4 border-t bg-muted/30">
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
                  J'ai lu et j'accepte les conditions
                </label>
              </div>

              {!hasScrolledToBottom && (
                <p className="text-xs text-muted-foreground text-center">
                  Faites défiler pour accepter
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
                  <ArrowRight className="h-4 w-4" />
                  Continuer
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

export default LandTitleTermsDialog;
