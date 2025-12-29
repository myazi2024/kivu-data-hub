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
        <DialogContent className="z-[9999] max-w-2xl max-h-[90vh] w-[95vw] sm:w-full p-0 overflow-hidden bg-background border-border">
          {/* Header - compact on mobile */}
          <DialogHeader className="p-3 sm:p-6 pb-3 sm:pb-4 border-b bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-xl font-semibold">
                  Demande de Titre Foncier
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                  Conditions d'utilisation
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Content - optimized scroll height for mobile */}
          <ScrollArea 
            className="h-[50vh] sm:h-[450px]"
            onScrollCapture={handleScroll}
            ref={scrollRef}
          >
            <div className="p-3 sm:p-6 space-y-3 sm:space-y-4">
              {/* Introduction Card - compact */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <Info className="h-4 w-4 sm:h-5 sm:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-xs sm:text-sm text-foreground leading-relaxed">
                      Soumettez une demande de titre foncier auprès des autorités de la RDC.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Points clés - compact grid on mobile */}
              <div className="space-y-2 sm:space-y-3">
                <h3 className="font-medium text-sm sm:text-base text-foreground flex items-center gap-2">
                  <Scale className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                  Points essentiels
                </h3>
                <div className="grid gap-2 sm:gap-3">
                  <Card className="border-muted">
                    <CardContent className="p-2 sm:p-3 flex items-center gap-2 sm:gap-3">
                      <div className="p-1 sm:p-1.5 bg-blue-500/10 rounded">
                        <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium">Délai: 30-90 jours</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-muted">
                    <CardContent className="p-2 sm:p-3 flex items-center gap-2 sm:gap-3">
                      <div className="p-1 sm:p-1.5 bg-green-500/10 rounded">
                        <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium">Documents requis</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-muted">
                    <CardContent className="p-2 sm:p-3 flex items-center gap-2 sm:gap-3">
                      <div className="p-1 sm:p-1.5 bg-amber-500/10 rounded">
                        <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium">Frais administratifs</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <Separator />

              {/* Conditions - compact list */}
              <div className="space-y-2 sm:space-y-3">
                <h3 className="font-medium text-sm sm:text-base text-foreground">Conditions</h3>
                <Card className="border-muted">
                  <CardContent className="p-3 sm:p-4">
                    <ul className="text-xs sm:text-sm text-muted-foreground space-y-1.5 sm:space-y-2">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-green-500 flex-shrink-0" />
                        <span className="truncate">Informations exactes</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-green-500 flex-shrink-0" />
                        <span className="truncate">Documents authentiques</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-green-500 flex-shrink-0" />
                        <span className="truncate">Respect des lois foncières</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-green-500 flex-shrink-0" />
                        <span className="truncate">Paiement des frais</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Avertissement - compact */}
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive flex-shrink-0" />
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      <span className="font-medium text-destructive">Attention:</span> Fausse déclaration passible de poursuites.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Protection des données - compact */}
              <Card className="border-muted">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Données confidentielles et sécurisées.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="h-2 sm:h-4" />
            </div>
          </ScrollArea>

          {/* Footer - compact on mobile */}
          <DialogFooter className="p-3 sm:p-6 pt-3 sm:pt-4 border-t bg-muted/30">
            <div className="w-full space-y-3 sm:space-y-4">
              {/* Checkbox */}
              <div className="flex items-center gap-2 sm:gap-3">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                  disabled={!hasScrolledToBottom}
                  className="h-4 w-4"
                />
                <label 
                  htmlFor="terms" 
                  className={`text-xs sm:text-sm cursor-pointer ${
                    !hasScrolledToBottom ? 'text-muted-foreground' : 'text-foreground'
                  }`}
                >
                  J'accepte les conditions
                </label>
              </div>

              {!hasScrolledToBottom && (
                <p className="text-[10px] sm:text-xs text-muted-foreground text-center">
                  Faites défiler pour accepter
                </p>
              )}

              {/* Boutons */}
              <div className="flex gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1 h-9 sm:h-10 text-xs sm:text-sm"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleAccept}
                  disabled={!termsAccepted}
                  className="flex-1 h-9 sm:h-10 text-xs sm:text-sm gap-1.5 sm:gap-2"
                >
                  <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
